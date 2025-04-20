/*
Funksjonen buildConversationForGPT tar inn en liste med meldinger (allMessages)
og bygger en strukturert samtale som GPT-modellen kan forstå.

Input: 
- allMessages: En liste med meldinger, der hver melding er et objekt med
  egenskapene:
  - sender: Angir hvem som sendte meldingen ("user" eller "bot").
  - text: Selve teksten i meldingen.

Hva funksjonen gjør:
1. Fjerner meldinger uten tekst (meldinger der `text` er tom eller ikke finnes).
2. Mapper hver melding til et nytt format som GPT-modellen forstår:
   - 'role': Settes til "user" hvis meldingen er fra brukeren, og "assistant" hvis den er fra boten.
   - 'content': Inneholder teksten fra meldingen.

Hvorfor:
- For å sikre at vi bare sender relevante meldinger med faktisk innhold til GPT-modellen.
- Dette reduserer unødvendige data og forbedrer ytelsen.
- Det kan også redusere kostnadene ved API-kall.

Returnerer: 
- En liste som kan brukes direkte for å sende samtalen til GPT-modellen.
*/

const buildConversationForGPT = (allMessages) => { 
  return allMessages // Tar inn alle meldinger
    .filter((m) => m.text) // Fjerner meldinger uten `text`
    .map((m) => ({ 
      role: m.sender === "bot" ? "assistant" : "user", // Setter rollen basert på sender
      content: m.text, // Innholdet i meldingen
    }));
};

export default buildConversationForGPT;