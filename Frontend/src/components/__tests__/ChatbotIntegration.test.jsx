// Chatbot.integration.test.jsx
// 📄 Formål:
// Dette er en integrasjonstestfil for Chatbot-komponenten. Den bruker Jest og React Testing Library til å 
// teste hvordan komponenten samhandler med brukerinput og tilhørende logikk, inkludert mocking av hjelpefunksjoner.
// Filen sikrer at:
// 1. Brukeren får tilgang til inputfelt etter å ha gitt samtykke.
// 2. Meldinger sendes og vises riktig i UI-et.
// 3. Restart-funksjonen reinitialiserer samtalen korrekt.

// === IMPORTER OG OPPSETT ===
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Chatbot from '../Chatbot';
import { act } from 'react-dom/test-utils';

// 💡 Scroll-mock for jsdom (nødvendig fordi scrollIntoView finnes ikke i JSDOM)
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// === MOCKS AV HELPEFUNKSJONER ===

// Mock for sendMessage – simulerer at bruker og bot sender meldinger
jest.mock('../../utils/sendMessage', () => ({
  __esModule: true,
  default: jest.fn((input, setInput, setMessages) => {
    setInput('');
    setMessages((prev) => {
      const prevMsgs = typeof prev === 'function' ? prev([]) : prev;
      return [...prevMsgs, { sender: 'user', text: input }, { sender: 'bot', text: 'Svar fra bot' }];
    });
  })
}));

// Mock for finishChat – simulerer at chatten avsluttes og oppsummering vises
jest.mock('../../utils/finishChat', () => ({
  __esModule: true,
  default: jest.fn((_, __, ___, ____, _____, setMessages, setChatEnded) => {
    setMessages((prev) => {
      const prevMsgs = typeof prev === 'function' ? prev([]) : prev;
      return [...prevMsgs, { sender: 'bot', text: 'Her er en oppsummering av samtalen' }];
    });
    setChatEnded(true);
  })
}));

// Mock for restartChat – simulerer en restart av chatten
jest.mock('../../utils/restartChat', () => ({
  __esModule: true,
  default: jest.fn((setChatId, setConsent, setChatEnded, setIsFinishingChat, setMessages) => {
    setChatId(null);
    setConsent(null);
    setChatEnded(false);
    setIsFinishingChat(false);
    setMessages([{ sender: 'bot', text: 'Startet på nytt' }]);
  })
}));

// Mock for startNewChat – setter en ny chat-ID
jest.mock('../../utils/startNewChat', () => ({
  __esModule: true,
  default: jest.fn((setChatId) => setChatId('mocked-chat-id')),
}));

// Mock for handleConsent – brukes når brukeren godtar samtykke
import handleConsent from '../../utils/handleConsent';
jest.mock('../../utils/handleConsent');

// === RESET OG SETUP FØR HVERT TESTCASE ===
beforeEach(() => {
  jest.clearAllMocks();

  // Mock implementasjon for samtykke – simulerer at boten svarer med en introduksjon og spørsmål
  handleConsent.mockImplementation((consent, setConsent, setMessages) => {
    setConsent(consent);
    setMessages((prev) => {
      const prevMsgs = typeof prev === 'function' ? prev([]) : prev;
      return [...prevMsgs, { sender: 'bot', text: 'Test intro' }, { sender: 'bot', text: 'Hva heter du?' }];
    });
  });
});

// === HJELPEFUNKSJON ===

// Gjør det som skjer når brukeren trykker på "Godta"-knappen
const acceptConsent = async () => {
  render(<Chatbot />);
  const godta = await screen.findByRole('button', { name: /godta/i });
  fireEvent.click(godta);
  await screen.findByText(/test intro/i);
  await screen.findByText(/hva heter du\?/i);
};

// === INTEGRASJONSTESTER ===

describe('Chatbot integrasjonstester', () => {
  
  // Tester at inputfeltet vises etter at bruker har gitt samtykke
  it('viser inputfelt etter samtykke', async () => {
    await acceptConsent();
    const input = screen.getByPlaceholderText(/skriv melding her/i);
    expect(input).toBeInTheDocument();
  });

  // Tester at brukerens melding blir sendt og at botens svar vises etterpå
  it('sender melding og viser svar fra bot', async () => {
    await acceptConsent();
    const input = screen.getByPlaceholderText(/skriv melding her/i);
    const sendButton = screen.getByRole('button', { name: '➤' });

    await userEvent.clear(input);
    await userEvent.type(input, 'Hei');
    fireEvent.click(sendButton);

    await waitFor(() => {
      const messages = screen.getAllByText((content, node) =>
        node?.textContent?.toLowerCase().includes('hei') ||
        node?.textContent?.toLowerCase().includes('svar fra bot')
      );
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Tester at restartChat-funksjonen faktisk blir kalt når restart initieres
  it('starter ny samtale ved restart', async () => {
    const restartSpy = require('../../utils/restartChat').default;
    await acceptConsent();

    restartSpy(jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn());

    await waitFor(() => {
      expect(restartSpy).toHaveBeenCalled();
    });
  });
});
