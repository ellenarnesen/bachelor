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

// Bruker miljøvariabel for API-kall
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

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
  const [isFinishingChat, setIsFinishingChat] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [phase, setPhase] = useState(1);
  const [hoverText, setHoverText] = useState("Klikk for å kopiere ID");
  const [hoverXbottom, setHoverXbottom] = useState("Klikk for å avslutte samtalen og få en oppsummering");
  const [isAwaitingSummaryConfirmation, setIsAwaitingSummaryConfirmation] = useState(false);


  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (consent) {
      startNewChat();
    }
  }, [consent]);

  const startNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert([{ status: "active" }])
        .select()
        .single();

      if (error) throw error;

      setChatId(data.id);
      console.log("✅ Ny samtale startet med ID:", data.id);
    } catch (error) {
      console.error("❌ Feil ved oppstart av chat:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  const handleConsent = async (userConsent) => {
    setConsent(userConsent);

    const userMsg = {
      sender: "user",
      text: userConsent
        ? "Ja, jeg samtykker."
        : "Nei, jeg ønsker ikke lagring.",
    };
    const botMsg = {
      sender: "bot",
      text: "Den er grei! Mitt navn er SoftAI. Vi skal gå inn på....hva heter du?", 
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);

    if (userConsent) {
      await startNewChat();
      saveMessage(userMsg);
      saveMessage(botMsg);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
  
    const userMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    saveMessage(userMessage);
    setInput("");
    inputRef.current.style.height = "30px";
  
    // 👇 Brukeren svarer på oppsummering etter fase 2
    if (isAwaitingSummaryConfirmation && phase === 2) {
      console.log("✅ Bruker har bekreftet oppsummering. Går videre til fase 3.");
      setIsAwaitingSummaryConfirmation(false);
      setPhase(3);
  
      const confirmReply = await askChatbot(buildConversationForGPT([
        ...messages,
        userMessage
      ]), phaseThreePrompt);
  
      setMessages((prev) => [...prev, { sender: "bot", text: confirmReply }]);
      saveMessage({ sender: "bot", text: confirmReply });
      setLoading(false);
      setIsTyping(false);
      return;
    }
  
    // 👇 Brukeren svarer på oppsummering etter fase 3
    if (isAwaitingSummaryConfirmation && phase === 3) {
      console.log("✅ Bruker har bekreftet oppsummering. Går videre til fase 4.");
      setIsAwaitingSummaryConfirmation(false);
      setPhase(4);
  
      const confirmReply = await askChatbot(buildConversationForGPT([
        ...messages,
        userMessage
      ]), phaseFourPrompt);
  
      setMessages((prev) => [...prev, { sender: "bot", text: confirmReply }]);
      saveMessage({ sender: "bot", text: confirmReply });
      setLoading(false);
      setIsTyping(false);
      return;
    }
  
    setIsTyping(true);
  
    setTimeout(async () => {
      let botReply = "";
      const conversationMessages = buildConversationForGPT([
        ...messages,
        userMessage,
      ]);
  
      let systemPrompt = phaseOnePrompt;
      if (phase === 2) {
        systemPrompt = phaseTwoPrompt;
      } else if (phase === 3) {
        systemPrompt = phaseThreePrompt;
      } else if (phase === 4) {
        systemPrompt = phaseFourPrompt;
      }
  
      botReply = await askChatbot(conversationMessages, systemPrompt);
  
      const newQuestionCount = questionCount + 1;
      setQuestionCount(newQuestionCount);
  
      let newPhase = phase;
  
      if (newQuestionCount === 5 && phase === 1) {
        console.log("Bytter til fase 2...");
        newPhase = 2;
      } 
      else if (newQuestionCount === 8 && phase === 2) {
        console.log("🔄 Brukeren har sendt sitt 8. spørsmål (slutt på fase 2).");
  
        setIsAwaitingSummaryConfirmation(true);
  
        const summaryPrompt = `
          Du er en AI-karriereveileder som fokuserer på motivasjonsfaktorer. 
          Forklar med 2 setinger hvordan din forståelse av dem har vært så langt.
          Forhør deg om de gjenkjenner seg i din forståelse av dem.
        `;
  
        const summaryReply = await askChatbot(buildConversationForGPT([
          ...messages,
          userMessage
        ]), summaryPrompt);
  
        console.log("🧠 Oppsummering etter fase 2:", summaryReply);
  
        setMessages((prev) => [...prev, { sender: "bot", text: summaryReply }]);
        saveMessage({ sender: "bot", text: summaryReply });
  
        setLoading(false);
        setIsTyping(false);
        return;
      } 
      else if (newQuestionCount === 15 && phase === 3) {
        console.log("🔄 Brukeren har sendt sitt 15. spørsmål (slutt på fase 3).");
  
        setIsAwaitingSummaryConfirmation(true);
  
        const summaryPrompt = `
          Du er en AI-karriereveileder som fokuserer på motivasjonsfaktorer. 
          Forklar med 2 setinger hvordan din forståelse av dem har vært så langt.
          Forhør deg om de gjenkjenner seg i din forståelse av dem.
        `;
  
        const summaryReply = await askChatbot(buildConversationForGPT([
          ...messages,
          userMessage
        ]), summaryPrompt);
  
        console.log("🧠 Oppsummering etter fase 3:", summaryReply);
  
        setMessages((prev) => [...prev, { sender: "bot", text: summaryReply }]);
        saveMessage({ sender: "bot", text: summaryReply });
  
        setLoading(false);
        setIsTyping(false);
        return;
      }
  
      setPhase(newPhase);
  
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      saveMessage({ sender: "bot", text: botReply });
  
      setIsTyping(false);
      setLoading(false);
    }, 500);
  };
  

  useEffect(() => {
    if (phase === 2) {
      console.log("Fase 2 er aktivert! Bytter til dypere motivasjonsanalyse.");
    }
    else if (phase === 3) {
    console.log("Fase 3 er aktivert! Bytter til videre analyse.");
    }
    else if (phase === 4) {
    console.log("Fase 4 er aktivert! Fullfører prosessen.");
    }
  }, [phase]);

  const saveMessage = async (message) => {
    if (!chatId || consent === false) {
      console.warn("⚠️ Meldinger lagres ikke: enten chatId ikke klar eller ikke samtykket.");
      return;
    }

    try {
      const { error } = await supabase
        .from("messages")
        .insert([{ chat_id: chatId, sender: message.sender, text: message.text }]);

      if (error) throw error;
    } catch (error) {
      console.error("❌ Feil ved lagring av melding:", error);
    }
  };

  const finishChat = async () => {
    if (isFinishingChat) return;
    setIsFinishingChat(true);

    try {
      if (consent !== false && chatId) {
        // Oppdater samtalestatus i databasen
        const { error } = await supabase
          .from("chats")
          .update({ status: "finished" })
          .eq("id", chatId);

        if (error) throw error;
      }

      // Bygg samtalen for oppsummering
      const conversationMessages = buildConversationForGPT(messages);

      // Oppsummer samtalen ved hjelp av en prompt
      const summaryPrompt = `
      Bruk all informasjon du har fått i samtalen til nå om denne personen.
      oppsummeringen skal ikke være punktvis men heller bare avsnittsbasert.
      del det inn i 3 avnsitt: start med en innledning, deretter gå over på å forklare de 5 punktene nedenfor og derretter en refleksjon.
      hold det til absolutt maks 5-8 setninger.

      Skriv en personlig og ærlig oppsummering som inneholder:

        1. Motivasjon og driv – Hva virker som viktig for personen? Hva motiverer dem?

        2. Styrker og ressurser – Hva er de gode på? Hva har de fått til?

        3. Muligheter og potensial – Hvilke veier virker åpne? Hva kunne de vurdere å satse mer på?

        4. Verdier og interesser – Hva bryr de seg om? Hva virker meningsfullt for dem?

        5. Utfordringer og blinde soner – Hva virker uklart, ubalansert eller underutviklet? Hva kunne de tenkt mer på eller tatt tak i?

      Avslutt med en refleksjon som både anerkjenner og utfordrer:
      Pek på noe vedkommende kanskje unngår, overser eller kan vokse mer i, og still et spørsmål som kan gi dem noe å tenke videre på.
      `;
      const summary = await askChatbot(conversationMessages, summaryPrompt);

      // Legg til oppsummeringen som en melding fra boten
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Her er en oppsummering av samtalen:" },
        { sender: "bot", text: summary },
        { sender: "bot", text: "Takk for samtalen!😊 Ha en fin dag videre!" },
      ]);

      setChatEnded(true);
    } catch (error) {
      console.error("❌ Feil ved oppdatering av samtalestatus eller oppsummering:", error);
    } finally {
      setIsFinishingChat(false);
    }
  };

  const restartChat = async () => {
    setChatId(null);
    setConsent(null);
    setChatEnded(false);
    setIsFinishingChat(false);
    setMessages([{ sender: "bot", text: initialMessage }]);
    startNewChat();
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current)
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "30px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const copyToClipboard = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(chatId)
        .then(() => {
          setCopySuccess("Chat-ID kopiert!");
          setTimeout(() => setCopySuccess(""), 2000);
        })
        .catch((err) => {
          console.error("Feil ved kopiering av Chat-ID:", err);
        });
    } else {
      console.warn("Clipboard API ikke tilgjengelig.");
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={logo} alt="MeyerHaugen" className="logo" />
        <p className="chat-date">
          {new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {chatId && (
          <p
            className="chat-id"
            onClick={copyToClipboard}
            title={hoverText}
            style={{ cursor: "pointer" }}
          >
            Chat ID: <span style={{textDecoration: "underline" }}>{chatId}</span> 
          </p>
        )}
      </header>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            {msg.sender === "bot" ? (
              i === messages.length - 1 ? (
                <img src={miniLogo} alt="Bot" className="bot-avatar" />
              ) : (
                <div className="bot-avatar-placeholder"></div>
              )
            ) : null}
            <div className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
          </div>
        ))}

        {isTyping && (
          <div className="typing-bubble">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatEnded && (
        <div className="restart-chat">
          <button className="restart-button" onClick={restartChat}>
                Start ny samtale
          </button>
        </div>
      )}

      {consent === null && (
        <div className="consent-buttons">
          <button className="accept" onClick={() => handleConsent(true)}>Godta</button>
          <button className="decline" onClick={() => handleConsent(false)}>Avslå</button>
        </div>
      )}

      {consent !== null && (
          <div className="chat-input">
              <textarea
                  ref={inputRef}
                  placeholder="Skriv melding her"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!chatEnded) sendMessage(); // Kun send hvis chat ikke er avsluttet
                      }
                  }}
                  disabled={loading || chatEnded} // Deaktivert hvis chat er avsluttet
                  rows={1}
                  style={{ resize: "none", minHeight: "30px", maxHeight: "200px", overflowY: "auto" }}
              />
              <button onClick={sendMessage} disabled={loading || chatEnded}>
                  ➤
              </button>
              <button 
                  onClick={finishChat} 
                  title={hoverXbottom}
                  disabled={isFinishingChat} // Deaktiver knappen etter første trykk
                  >                         
                  <IoClose />
              </button>
          </div>
      )}
    </div>
  );
};

function buildConversationForGPT(allMessages) {
  return allMessages.map((m) => ({
    role: m.sender === "bot" ? "assistant" : "user",
    content: m.text,
  }));
}

function countAssistantMessages(allMessages, currentPhase) {
  let count = 0;
  for (const msg of allMessages) {
    if (msg.sender === "bot") {
      count++;
    }
  }
  return count;
}

export default Chatbot;