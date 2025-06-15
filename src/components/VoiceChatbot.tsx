import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI('AIzaSyAtsZi5X1wERu2jaTwwHy4NBy2O2IqnEJo');

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute in milliseconds
};

interface RateLimitState {
  requests: number;
  resetTime: number;
}

interface VoiceChatbotProps {
  language: string;
}

const BigPulseCircle = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.span
        className="absolute inset-0 flex items-center justify-center z-10"
        initial={{ scale: 1, opacity: 0.85 }}
        animate={{ scale: [1, 1.42, 1], opacity: [0.92, 0.75, 0.92] }}
        exit={{ scale: 1, opacity: 0.5 }}
        transition={{
          repeat: Infinity,
          duration: 1.48,
          repeatType: "loop",
          ease: "easeInOut"
        }}
        style={{
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle at 48% 52%, #fff 15%, #D8B4F8 44%, #C084FC 80%, #A78BFA 99%)",
            boxShadow:
              "0 0 50px 14px #C084FC99, 0 0 80px 32px #A78BFA66, 0 0 0 40px #FFF3",
            filter: "brightness(1.18) blur(3px)",
            opacity: 1,
            zIndex: 1,
          }}
          className="animate-pulseLavender"
        />
      </motion.span>
    )}
  </AnimatePresence>
);

const VoiceChatbot: React.FC<VoiceChatbotProps> = ({ language }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'ai';
    content: string;
    confidence?: string;
    suggestion?: string;
  }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const rateLimitRef = useRef<RateLimitState>({
    requests: 0,
    resetTime: Date.now() + RATE_LIMIT.timeWindow,
  });

  const recognitionRef = useRef<any>(null); // To store the speech recognition instance

  const translations = {
    hindi: {
      placeholder: "अपने लक्षण बताएं या माइक दबाकर बोलें...",
      listening: "सुन रहा हूं...",
      processing: "जवाब तैयार कर रहा हूं...",
      send: "भेजें",
      speakResponse: "जवाब सुनें",
      stopSpeaking: "बंद करें",
      confidence: "विश्वसनीयता",
      suggestion: "सुझाव"
    },
    english: {
      placeholder: "Describe your symptoms or tap mic to speak...",
      listening: "Listening...",
      processing: "Processing response...",
      send: "Send",
      speakResponse: "Speak Response",
      stopSpeaking: "Stop",
      confidence: "Confidence",
      suggestion: "Suggestion"
    }
  };

  const t = translations[language];

  // Check rate limit
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now > rateLimitRef.current.resetTime) {
      rateLimitRef.current = {
        requests: 0,
        resetTime: now + RATE_LIMIT.timeWindow,
      };
    }

    if (rateLimitRef.current.requests >= RATE_LIMIT.maxRequests) {
      toast({
        title: language === 'hindi' ? 'अधिकतम सीमा तक पहुंच गया' : 'Rate limit reached',
        description: language === 'hindi' 
          ? 'कृपया कुछ देर बाद पुनः प्रयास करें' 
          : 'Please try again after a few minutes',
        variant: "destructive"
      });
      return false;
    }

    rateLimitRef.current.requests++;
    return true;
  };

  // Enhanced Gemini API call with better error handling and safety constraints
  const callGeminiAPI = async (symptomText: string) => {
    if (!checkRateLimit()) {
      return {
        response: language === 'hindi'
          ? "अधिकतम अनुरोध सीमा तक पहुंच गया है। कृपया कुछ देर बाद पुनः प्रयास करें।"
          : "Maximum request limit reached. Please try again after a few minutes.",
        confidence: "0%",
        suggestion: "error"
      };
    }

    try {
      // Safety constraints and prompt structure
      const safetyConstraints = `
        IMPORTANT SAFETY CONSTRAINTS:
        1. DO NOT provide specific medical diagnoses
        2. DO NOT recommend specific medications or treatments
        3. DO NOT provide emergency medical advice
        4. ALWAYS recommend consulting a healthcare professional
        5. Focus on general wellness and monitoring advice
        6. If symptoms seem severe, recommend immediate medical attention
        7. DO NOT make definitive statements about conditions
        8. DO NOT provide alternative medicine recommendations
        9. DO NOT suggest specific dietary supplements
        10. DO NOT provide psychological or mental health diagnoses
      `;

      const responseStructure = `
        Please provide a concise response in bullet points.
        Each bullet point should be a brief, actionable piece of advice (1-2 sentences maximum).
        Do not include any introductory or concluding sentences. 
        Focus purely on direct, helpful suggestions relevant to the user's concern.
      `;

      const prompt = `
        ${safetyConstraints}
        
        As a medical AI assistant, provide a concise and helpful response to the following health concern.
        ${responseStructure}
        
        User's concern: ${symptomText}
        
        Language: ${language === 'hindi' ? 'Hindi' : 'English'}
        
        Remember:
        - Provide concise, actionable information in bullet points.
        - Focus on general wellness and monitoring, always recommending professional advice when appropriate.
        - Avoid specific medical diagnoses or treatment recommendations.
        - Maintain a professional yet empathetic tone.
        - Only provide the bulleted points, no conversational text.
      `;

      // Get the generative model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      // Generate content using Gemini API
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response and extract confidence (this would need adjustment if Gemini API provides it)
      const confidence = "75%"; // You might need to derive this from Gemini's output
      const suggestion = "monitor"; // You might need to derive this from Gemini's output

      return {
        response: text,
        confidence,
        suggestion
      };
    } catch (error) {
      console.error('Error in API call:', error);
      
      // Enhanced error handling
      let errorMessage = language === 'hindi'
        ? "क्षमा करें, इस समय प्रतिक्रिया देने में असमर्थ हूं। कृपया कुछ देर बाद पुनः प्रयास करें।"
        : "I apologize, but I'm unable to provide a response at this time. Please try again later.";

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = language === 'hindi'
            ? "API कुंजी त्रुटि। कृपया सिस्टम प्रशासक से संपर्क करें।"
            : "API key error. Please contact system administrator.";
        } else if (error.message.includes('network')) {
          errorMessage = language === 'hindi'
            ? "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।"
            : "Network error. Please check your internet connection.";
        }
      }

      toast({
        title: language === 'hindi' ? 'त्रुटि' : 'Error',
        description: errorMessage,
        variant: "destructive"
      });

      return {
        response: errorMessage,
        confidence: "0%",
        suggestion: "error"
      };
    }
  };

  const formatAiResponse = (text: string) => {
    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    return (
      <ul className="list-disc list-inside space-y-0.5 ml-2">
        {lines.map((line, lineIndex) => {
          // Remove leading bullet points (• or *) and trim whitespace
          const cleanLine = line.replace(/^[•*]\s*/, '').trim();
          return cleanLine ? <li key={lineIndex}>{cleanLine}</li> : null;
        })}
      </ul>
    );
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { type: 'user' as const, content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await callGeminiAPI(inputText);
      
      const aiMessage = {
        type: 'ai' as const,
        content: response.response,
        confidence: response.confidence,
        suggestion: response.suggestion
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save to backend API (mock call)
      await saveHealthChatData({
        symptom_input: inputText,
        ai_response: response.response,
        confidence_score: response.confidence,
        suggestion_type: response.suggestion,
        language_selected: language
      });

      setInputText('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveHealthChatData = async (data: any) => {
    // Mock API call to save data
    console.log('Saving health chat data:', data);
    // In real implementation: fetch('/api/save-healthchat', { method: 'POST', body: JSON.stringify(data) })
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Clean the text by removing asterisks and other markdown formatting
      const cleanText = text
        .replace(/\*/g, '') // Remove asterisks
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing spaces

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('Speech synthesis stopped.');
    }
  };

  const startListening = () => {
    console.log('Attempting to start listening...');
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true; 

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        console.log('Speech recognition started. isListening:', true);
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended. isListening:', isListening);
        // We no longer set isListening to false here to maintain manual control.
      };

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
        console.log('Speech recognition result:', transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // Error handling toasts already exist
        setIsListening(false); 
        console.log('Speech recognition error occurred. isListening:', false);
      };

      recognitionRef.current.start();
    } else {
      toast({
        title: "Not Supported",
        description: "Speech recognition not supported in this browser",
        variant: "destructive"
      });
      console.warn('webkitSpeechRecognition not supported in this browser.');
    }
  };

  const stopListening = () => {
    console.log('Attempting to stop listening...');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false); // Explicitly set to false on manual stop
      console.log('Speech recognition manually stopped. isListening:', false);
    }
  };

  // --- COLORS ---
  // We'll use several layers for the pulse: 
  // - #C084FC (lavender)
  // - #A78BFA (dark lavender)
  // - #E0E7FF (highlight/white center)

  // --- PULSE CIRCLE COMPONENT ---
  // Make the circle very big, bright, and colorful

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-2 sm:px-4">
      {/* Messages / main prompt area */}
      <div className="space-y-4 relative z-40 px-1 w-full max-w-4xl">
        {/* Show prompt/mic ONLY if NO messages and not listening/speaking (hide when listening/speaking) */}
        {messages.length === 0 && !isListening && !isSpeaking && (
          <div className="text-center py-8 md:py-16 relative flex flex-col items-center justify-center">
            <div
              className="relative flex items-center justify-center mb-3 w-full overflow-hidden"
              style={{ minHeight: 120 }}
            >
              {/* Add pulse animation behind the mic icon */}
              <span className="absolute inset-0 flex items-center justify-center">
                <BigPulseCircle active={true} />
              </span>
              <span className="relative z-10 lavender-pulse flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
                <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-emerald-700 font-extrabold drop-shadow-lg" />
              </span>
            </div>
            <p className="font-mono text-primary text-xl md:text-2xl font-heading relative z-10 px-2">
              {language === "hindi"
                ? "अपने स्वास्थ्य संबंधी प्रश्न पूछें"
                : "Ask your health-related questions"}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <Card
            key={index}
            className={`${
              message.type === "user"
                ? "ml-auto bg-primary text-white max-w-[86vw] sm:max-w-sm md:max-w-md font-heading rounded-2xl shadow-lg-glass"
                : "mr-auto bg-white/80 text-foreground max-w-[96vw] sm:max-w-md md:max-w-lg font-mono rounded-2xl shadow-lg-glass"
            }`}
          >
            <CardContent className="p-3 md:p-4">
              {message.type === "user" ? (
                <p className="text-base md:text-lg mb-2 font-heading break-words">
                  {message.content}
                </p>
              ) : (
                <div className="text-base md:text-lg mb-2 font-heading break-words">
                  {formatAiResponse(message.content)}
                </div>
              )}

              {message.type === "ai" && (
                <div className="space-y-2 font-mono">
                  {message.confidence && (
                    <Badge variant="secondary" className="text-xs">
                      {t.confidence}: {message.confidence}
                    </Badge>
                  )}

                  {message.suggestion && (
                    <Badge
                      variant={
                        message.suggestion === "emergency" ? "destructive" : "default"
                      }
                      className="text-xs ml-2"
                    >
                      {t.suggestion}: {message.suggestion}
                    </Badge>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const cleanedText = message.content.replace(/\d+\.\s*|•\s*/g, '').replace(/\n/g, ' ');
                        speakText(cleanedText);
                      }}
                      disabled={isSpeaking}
                      className="font-heading"
                    >
                      <Volume2 className="w-3 h-3 mr-1 text-emerald-700 font-bold" />
                      {t.speakResponse}
                    </Button>

                    {isSpeaking && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={stopSpeaking}
                        className="font-heading"
                      >
                        <VolumeX className="w-3 h-3 mr-1 text-emerald-700 font-bold" />
                        {t.stopSpeaking}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {isLoading && (
          <Card className="mr-auto bg-gray-50 max-w-[95vw] sm:max-w-sm md:max-w-lg">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">{t.processing}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Input + mic/send */}
      <div className="flex flex-row gap-2 relative z-30 items-center justify-center w-full overflow-hidden">
        {(isListening || isSpeaking) && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <BigPulseCircle active={true} />
          </span>
        )}

        <div className="flex-1 w-full">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.placeholder}
            className="min-h-[42px] md:min-h-[60px] resize-none font-mono glass-input text-base"
            onKeyPress={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendMessage()
            }
          />
        </div>

        <div className="flex flex-row gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "default" : "outline"}
            className={`h-[42px] w-[42px] md:h-[60px] md:w-[60px] rounded-2xl font-heading ${
              isListening ? "bg-primary" : ""
            }`}
            aria-label={isListening ? t.stopSpeaking : t.speakResponse}
          >
            {isListening ? (
              <MicOff className="w-5 h-5 text-emerald-700 font-bold" />
            ) : (
              <Mic className="w-5 h-5 text-emerald-700 font-bold" />
            )}
          </Button>

          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="h-[42px] w-[42px] md:h-[60px] md:w-[60px] rounded-2xl font-heading bg-primary text-white font-bold"
            aria-label={t.send}
          >
            <Send className="w-5 h-5 text-emerald-700 font-bold" />
          </Button>
        </div>
      </div>
      {isListening && (
        <div className="text-center relative z-30 pt-1">
          <Badge variant="destructive" className="animate-pulse font-mono">
            {t.listening}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default VoiceChatbot;
