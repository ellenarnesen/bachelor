// src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  initialMessage,
  phaseOnePrompt,
  phaseTwoPrompt,
  phaseThreePrompt,
  phaseFourPrompt,
} from "../data/chatbotPrompts";
import "../styles/Chatbot.css";
import { askChatbot } from "../utils/langchainChatbot";
import logo from "../media/logo.png";
import miniLogo from "../media/MH_logo.png";
import { IoClose } from "react-icons/io5";
import { supabase } from "../supabaseClient";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: initialMessage },
  ]);
  const [consent, setConsent] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatEnded, setChatEnded] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [phase, setPhase] = useState(1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (consent !== null) {
      handleConsentResponse(consent);
    }
  }, [consent]);

  const handleConsentResponse = (userConsent) => {
    const consentMessage = userConsent
      ? "Takk for at du lar meg lagre chatten vår. Vi kan starte med hva du heter?"
      : "Da lagres ikke chatten vår. Vi kan starte med hva du heter?";
    setMessages((prev) => [...prev, { sender: "bot", text: consentMessage }]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    const userMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    inputRef.current.style.height = "30px";

    setIsTyping(true);
    
    setTimeout(async () => {
      let systemPrompt = phaseOnePrompt;
      if (phase === 2) {
        systemPrompt = phaseTwoPrompt;
      } else if (phase === 3) {
        systemPrompt = phaseThreePrompt;
      } else if (phase === 4) {
        systemPrompt = phaseFourPrompt;
      }

      if (questionCount + 1 >= 5 && phase < 4) {
        setLoading(true);
        setIsTyping(true);
        const newPhase = phase + 1;
        console.log(`Bytter til fase ${newPhase}...`);
        
        setPhase(newPhase);
        setQuestionCount(0);
        
        const newPrompt = newPhase === 2 ? phaseTwoPrompt :
                          newPhase === 3 ? phaseThreePrompt :
                          phaseFourPrompt;
        
        const formattedMessages = [...messages, userMessage].map((msg) => ({
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        }));
        
        const botReply = await askChatbot(formattedMessages, systemPrompt);
        
        setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
        
        setTimeout(async () => {
          const nextBotReply = await askChatbot([...formattedMessages, { role: "assistant", content: botReply }], newPrompt);
          setMessages((prev) => [...prev, { sender: "bot", text: nextBotReply }]);
          setLoading(false);
          setIsTyping(false);
        }, 500);
        return;
      } else {
        const formattedMessages = [...messages, userMessage].map((msg) => ({
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        }));

        const botReply = await askChatbot(formattedMessages, systemPrompt);
        setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
        setQuestionCount((prevCount) => prevCount + 1);
      }

      setIsTyping(false);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={logo} alt="MeyerHaugen" className="logo" />
        <p className="chat-date">{new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>
      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            {msg.sender === "bot" && <img src={miniLogo} alt="Bot" className="bot-avatar" />}
            <div className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message bot">
            <div className="typing-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {consent === null ? (
        <div className="consent-buttons">
          <button className="accept" onClick={() => setConsent(true)}>Godta</button>
          <button className="decline" onClick={() => setConsent(false)}>Avslå</button>
        </div>
      ) : (
        <div className="chat-input">
          <textarea
            ref={inputRef}
            placeholder="Skriv melding her"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!chatEnded) sendMessage();
              }
            }}
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || chatEnded}>➤</button>
          <button onClick={() => setChatEnded(true)}><IoClose /></button>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
