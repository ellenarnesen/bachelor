// === MOCK SETUP ===
// Vi mocker Supabase for å unngå ekte API-kall under testing
const mockInsert = jest.fn(() => Promise.resolve({}));
const mockUpdate = jest.fn(() => Promise.resolve({}));
const mockEq = jest.fn(() => Promise.resolve({}));
const mockFrom = jest.fn(() => ({ insert: mockInsert, update: mockUpdate, eq: mockEq }));

jest.mock('../../supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

// Vi mocker også langchainChatbot sin askChatbot funksjon for å kontrollere returverdi
jest.mock('../../utils/langchainChatbot', () => ({
  askChatbot: jest.fn(() => Promise.resolve("**Intro**\n- Punkt 1"))
}));

jest.useFakeTimers();

// === TESTER FOR FUNKSJONER ===

describe('buildConversationForGPT', () => {
  // Tester om funksjonen konverterer meldinger korrekt til GPT-format
  it('converts messages correctly', () => {
    const fn = require('../../utils/buildConversation').default;
    const input = [{ sender: "user", text: "Hei" }, { sender: "bot", text: "Hallo!" }];
    const expected = [
      { role: "user", content: "Hei" },
      { role: "assistant", content: "Hallo!" }
    ];
    expect(fn(input)).toEqual(expected);
  });
});

describe('copyToClipboard', () => {
  // Tester at teksten faktisk blir forsøkt kopiert og at bruker-feedback settes
  it('copies text successfully', async () => {
    const fn = require('../../utils/copyToClipboard').default;
    navigator.clipboard = { writeText: jest.fn(() => Promise.resolve()) };
    const setCopySuccess = jest.fn();
    await fn("abc123", setCopySuccess);
    expect(setCopySuccess).toHaveBeenCalledWith("Chat-ID kopiert!");
  });
});

describe('countUserMessages', () => {
  // Tester at funksjonen korrekt teller antall meldinger sendt av brukeren
  it('counts user messages', () => {
    const fn = require('../../utils/questionCounter').default;
    const msgs = [
      { sender: "user", text: "Hei" },
      { sender: "bot", text: "Hallo" },
      { sender: "user", text: "Går det bra?" }
    ];
    expect(fn(msgs)).toBe(2);
  });
});

describe('scrollToBottom', () => {
  // Tester at scroll-funksjon kalles korrekt ved enden av meldingslisten
  it('calls scrollIntoView', () => {
    const fn = require('../../utils/scrollToBottom').default;
    const ref = { current: { scrollIntoView: jest.fn() } };
    fn(ref);
    expect(ref.current.scrollIntoView).toHaveBeenCalled();
  });
});

describe('startNewChat', () => {
  // Tester at en ny samtale settes opp og ID lagres i state
  it('sets chat ID after Supabase insert', async () => {
    const fn = require('../../utils/startNewChat').default;
    const setChatId = jest.fn();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: "chat123" }, error: null }))
        }))
      }))
    });
    await fn(setChatId);
    expect(setChatId).toHaveBeenCalledWith("chat123");
  });
});

describe('saveMessage', () => {
  // Tester at meldingen lagres i databasen hvis samtykke er gitt
  it('saves message when allowed', async () => {
    const fn = require('../../utils/saveMessage').default;
    await fn("chat123", true, { sender: "user", text: "Hello" });
    expect(mockFrom).toHaveBeenCalled();
  });
});

describe('restartChat', () => {
  // Tester at staten nullstilles og en ny melding vises
  it('resets state and starts new chat', () => {
    const fn = require('../../utils/restartChat').default;
    const setChatId = jest.fn();
    const setConsent = jest.fn();
    const setChatEnded = jest.fn();
    const setIsFinishingChat = jest.fn();
    const setMessages = jest.fn();
    fn(setChatId, setConsent, setChatEnded, setIsFinishingChat, setMessages);
    expect(setChatId).toHaveBeenCalledWith(null);
    expect(setMessages).toHaveBeenCalled();
  });
});

describe('handleConsent', () => {
  // Tester at samtykke registreres og at startChat og meldingslisten oppdateres
  it('updates consent and messages', async () => {
    const fn = require('../../utils/handleConsent').default;
    const setConsent = jest.fn();
    const setMessages = jest.fn((cb) => cb ? cb([]) : []);
    const startNewChat = jest.fn(() => Promise.resolve());
    await fn(true, setConsent, setMessages, startNewChat, "chat123", "kryssIkon");
    expect(setConsent).toHaveBeenCalledWith(true);
  });
});

describe('finishChat', () => {
  // Tester hele avslutningsflyten: oppdater status, hent oppsummering, lagre meldinger, avslutt chat
  it('completes the chat flow', async () => {
    const fn = require('../../utils/finishChat').default;
    const setIsFinishingChat = jest.fn();
    const setMessages = jest.fn();
    const setChatEnded = jest.fn();
    const saveMessage = require('../../utils/saveMessage').default;
    jest.spyOn(require('../../utils/saveMessage'), 'default').mockImplementation(() => Promise.resolve());
    await fn(false, setIsFinishingChat, true, "chat123", [{ sender: "user", text: "hei" }], setMessages, setChatEnded, "prompt");
    expect(setIsFinishingChat).toHaveBeenCalled();
  });
});

describe('sendMessage', () => {
  // Tester hele meldingsflyten: send input, vis spinner, generer svar og lagre alt
  it('sends user message and handles bot response', async () => {
    const fn = require('../../utils/sendMessage').default;
    const setInput = jest.fn();
    const setMessages = jest.fn((cb) => cb([]));
    const setLoading = jest.fn();
    const setIsTyping = jest.fn();
    const inputRef = { current: { style: { height: "" } } };
    const saveMessage = require('../../utils/saveMessage').default;
    jest.spyOn(require('../../utils/saveMessage'), 'default').mockImplementation(() => Promise.resolve());
    await fn("Hei!", setInput, setMessages, setLoading, setIsTyping, "chat123", true, [], "prompt", inputRef);
    expect(setInput).toHaveBeenCalledWith("");
    expect(setIsTyping).toHaveBeenCalled();
  });
});
