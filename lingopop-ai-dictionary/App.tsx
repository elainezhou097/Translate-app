
import React, { useState, useEffect, useRef } from 'react';
import { LANGUAGES, MOCK_IMAGE } from './constants';
import { AppView, DictionaryEntry, Language, ChatMessage } from './types';
import { lookupWord, generateConceptImage, playTTS, chatWithWord, generateStory } from './services/geminiService';
import { IconVolume, IconSend, IconBook, IconBrain, IconStory, IconArrowLeft, IconRefresh } from './components/Icons';

export default function App() {
  // --- State ---
  const [view, setView] = useState<AppView>(AppView.SETUP);
  const [nativeLang, setNativeLang] = useState<Language>(LANGUAGES[0]);
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[1]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [notebook, setNotebook] = useState<DictionaryEntry[]>(() => {
    const saved = localStorage.getItem('lingopop_notebook');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Story & Flashcard State
  const [generatedStory, setGeneratedStory] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('lingopop_notebook', JSON.stringify(notebook));
  }, [notebook]);

  useEffect(() => {
      if(view === AppView.RESULT && scrollRef.current) {
          scrollRef.current.scrollTop = 0;
      }
  }, [view, currentEntry]);


  // --- Handlers ---

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setView(AppView.RESULT);
    setChatHistory([]); // Reset chat for new word

    try {
      // 1. Get Text content
      const entryData = await lookupWord(input, targetLang.name, nativeLang.name);
      
      const newEntry: DictionaryEntry = {
        ...entryData,
        id: Date.now().toString(),
        timestamp: Date.now(),
        targetLanguage: targetLang.name,
        nativeLanguage: nativeLang.name
      };
      
      setCurrentEntry(newEntry); // Show text immediately

      // 2. Generate Image in background
      generateConceptImage(newEntry.imagePrompt || newEntry.word).then(img => {
        if(img) {
            setCurrentEntry(prev => prev ? { ...prev, imageUrl: img } : null);
        }
      });

    } catch (error) {
      console.error(error);
      alert("Oops! Something went wrong searching for that word.");
      setView(AppView.SEARCH);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (currentEntry && !notebook.find(n => n.word === currentEntry.word)) {
      setNotebook([currentEntry, ...notebook]);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !currentEntry) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
        const historyForApi = chatHistory.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        const response = await chatWithWord(historyForApi, userMsg, currentEntry);
        setChatHistory(prev => [...prev, { role: 'model', text: response || "I'm speechless!" }]);
    } catch (e) {
        setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I got a bit confused. Try again?" }]);
    } finally {
        setChatLoading(false);
    }
  };

  const handleStoryTime = async () => {
      setStoryLoading(true);
      setView(AppView.STORY);
      try {
          const story = await generateStory(notebook, targetLang.name, nativeLang.name);
          setGeneratedStory(story);
      } catch (e) {
          setGeneratedStory("Sorry, couldn't write a story right now.");
      } finally {
          setStoryLoading(false);
      }
  };

  const handlePlayTTS = (text: string) => {
      playTTS(text, targetLang.voiceName);
  };

  // --- Views ---

  const renderSetup = () => (
    <div className="min-h-screen flex flex-col justify-center items-center bg-pop-purple p-6 text-white text-center">
      <h1 className="text-5xl font-display font-bold mb-2 text-pop-yellow animate-bounce-slight">LingoPop</h1>
      <p className="mb-10 text-lg opacity-90">Your AI Language Buddy</p>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
        <label className="block text-left mb-2 text-sm font-bold">My Native Language</label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {LANGUAGES.slice(0, 4).map(l => (
            <button key={l.code} 
              onClick={() => setNativeLang(l)}
              className={`p-3 rounded-xl border-2 transition-all ${nativeLang.code === l.code ? 'bg-pop-yellow border-pop-yellow text-pop-dark' : 'border-white/30 hover:bg-white/10'}`}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>

        <label className="block text-left mb-2 text-sm font-bold">I Want to Learn</label>
        <div className="grid grid-cols-2 gap-2 mb-8">
          {LANGUAGES.filter(l => l.code !== nativeLang.code).slice(0, 6).map(l => (
            <button key={l.code} 
              onClick={() => setTargetLang(l)}
              className={`p-3 rounded-xl border-2 transition-all ${targetLang.code === l.code ? 'bg-pop-cyan border-pop-cyan text-pop-dark' : 'border-white/30 hover:bg-white/10'}`}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setView(AppView.SEARCH)}
          className="w-full bg-pop-yellow text-pop-dark font-display font-bold text-xl py-4 rounded-full shadow-lg hover:scale-105 transition-transform">
          Let's Go! 🚀
        </button>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="min-h-screen bg-pop-yellow flex flex-col items-center p-6 relative">
      <div className="w-full max-w-md mt-20 flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-pop-dark">What do you want to say?</h2>
          <p className="text-pop-dark/70 mt-2">In {targetLang.name}</p>
        </div>

        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Type a word, phrase or sentence..."
            className="w-full p-6 text-xl rounded-3xl shadow-xl focus:outline-none focus:ring-4 ring-pop-purple text-pop-dark placeholder:text-gray-400"
          />
          <button 
            onClick={handleSearch}
            className="absolute right-3 top-3 bg-pop-purple text-white p-3 rounded-2xl hover:bg-purple-700 transition-colors">
            <IconSend />
          </button>
        </div>

        <div className="flex justify-center gap-4 mt-10">
           <button onClick={() => setView(AppView.NOTEBOOK)} className="flex flex-col items-center gap-2 text-pop-dark hover:scale-110 transition-transform">
              <div className="bg-white p-4 rounded-full shadow-md"><IconBook /></div>
              <span className="font-bold text-sm">Notebook</span>
           </button>
        </div>
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-10 left-[-20px] w-32 h-32 bg-pop-pink rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-10 right-[-20px] w-32 h-32 bg-pop-cyan rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    </div>
  );

  const renderResult = () => {
    if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-pop-purple border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-display font-bold text-xl text-pop-purple">Thinking...</p>
      </div>
    );

    if (!currentEntry) return null;

    const isSaved = notebook.some(n => n.word === currentEntry.word);

    return (
      <div ref={scrollRef} className="min-h-screen bg-gray-50 pb-24 relative">
        {/* Header Image */}
        <div className="w-full h-64 bg-gray-200 relative overflow-hidden">
             {currentEntry.imageUrl ? (
                 <img src={currentEntry.imageUrl} alt={currentEntry.word} className="w-full h-full object-cover" />
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">Generating Art...</div>
             )}
             <button onClick={() => setView(AppView.SEARCH)} className="absolute top-4 left-4 bg-white/50 backdrop-blur p-2 rounded-full hover:bg-white transition-colors">
                <IconArrowLeft />
             </button>
        </div>

        <div className="px-6 -mt-10 relative z-10">
             <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-4xl font-display font-bold text-pop-dark">{currentEntry.word}</h1>
                    <button onClick={() => handlePlayTTS(currentEntry.word)} className="p-2 bg-pop-yellow rounded-full text-pop-dark hover:scale-110 transition-transform">
                        <IconVolume />
                    </button>
                </div>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-4">{targetLang.name}</p>
                <p className="text-xl text-pop-purple font-medium mb-4">{currentEntry.explanation}</p>
                
                <button 
                  onClick={handleSaveToNotebook}
                  disabled={isSaved}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${isSaved ? 'bg-gray-200 text-gray-400' : 'bg-pop-dark text-white hover:bg-black'}`}>
                  {isSaved ? 'Saved to Notebook' : 'Save Word'}
                </button>
             </div>

             {/* Usage Note */}
             <div className="bg-pop-cyan/10 border-2 border-pop-cyan rounded-2xl p-5 mb-6">
                 <h3 className="text-pop-cyan font-bold flex items-center gap-2 mb-2">
                    <span className="text-xl">💡</span> Quick Note
                 </h3>
                 <p className="text-pop-dark leading-relaxed">{currentEntry.usageNote}</p>
             </div>

             {/* Examples */}
             <div className="space-y-4 mb-8">
                 <h3 className="font-bold text-gray-400 uppercase text-sm">Examples</h3>
                 {currentEntry.examples.map((ex, i) => (
                     <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                         <div className="flex justify-between items-start">
                             <p className="text-lg font-medium text-pop-dark mb-1">{ex.target}</p>
                             <button onClick={() => handlePlayTTS(ex.target)} className="text-pop-purple hover:bg-purple-50 p-1 rounded">
                                 <IconVolume className="w-5 h-5" />
                             </button>
                         </div>
                         <p className="text-gray-500">{ex.native}</p>
                     </div>
                 ))}
             </div>

             {/* Chat Section */}
             <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 mb-6">
                 <div className="bg-pop-purple p-4 text-white font-bold">Chat about "{currentEntry.word}"</div>
                 <div className="p-4 bg-gray-50 max-h-60 overflow-y-auto space-y-3">
                     <div className="flex gap-2">
                         <div className="w-8 h-8 rounded-full bg-pop-purple flex items-center justify-center text-white text-xs">AI</div>
                         <div className="bg-white p-3 rounded-r-xl rounded-bl-xl shadow-sm text-sm text-gray-700">
                             Ask me anything else about this word!
                         </div>
                     </div>
                     {chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${msg.role === 'user' ? 'bg-pop-dark' : 'bg-pop-purple'}`}>
                                 {msg.role === 'user' ? 'Me' : 'AI'}
                             </div>
                             <div className={`p-3 shadow-sm text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-pop-dark text-white rounded-l-xl rounded-br-xl' : 'bg-white text-gray-700 rounded-r-xl rounded-bl-xl'}`}>
                                 {msg.text}
                             </div>
                         </div>
                     ))}
                     {chatLoading && <div className="text-xs text-gray-400 text-center animate-pulse">Typing...</div>}
                 </div>
                 <div className="p-3 border-t bg-white flex gap-2">
                     <input 
                       className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-pop-purple"
                       placeholder="Ask a question..."
                       value={chatInput}
                       onChange={e => setChatInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                     />
                     <button onClick={handleChatSend} className="bg-pop-purple text-white p-2 rounded-full"><IconSend className="w-4 h-4" /></button>
                 </div>
             </div>
        </div>
      </div>
    );
  };

  const renderNotebook = () => (
    <div className="min-h-screen bg-white flex flex-col relative">
        <div className="p-6 bg-pop-dark text-white sticky top-0 z-20 shadow-md">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setView(AppView.SEARCH)} className="hover:text-pop-yellow"><IconArrowLeft /></button>
                <h2 className="font-display font-bold text-2xl">My Notebook</h2>
                <div className="w-6"></div> 
            </div>
            
            <div className="flex gap-2">
                <button 
                  onClick={handleStoryTime}
                  disabled={notebook.length < 2}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-pop-dark transition-colors ${notebook.length < 2 ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-pop-yellow hover:bg-yellow-300'}`}>
                    <IconStory /> Story Mode
                </button>
                <button 
                  onClick={() => { setFlashcardIndex(0); setIsFlipped(false); setView(AppView.FLASHCARDS); }}
                  disabled={notebook.length < 1}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-colors ${notebook.length < 1 ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-pop-purple hover:bg-purple-600'}`}>
                    <IconBrain /> Study
                </button>
            </div>
        </div>

        <div className="p-6 grid grid-cols-1 gap-4 overflow-y-auto">
            {notebook.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                    <p className="text-4xl mb-2">📓</p>
                    <p>Your notebook is empty.</p>
                </div>
            )}
            {notebook.map((item) => (
                <div key={item.id} onClick={() => { setCurrentEntry(item); setView(AppView.RESULT); }} className="flex items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-pop-purple transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden mr-4 flex-shrink-0">
                         {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-pop-cyan"></div>}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-pop-dark">{item.word}</h3>
                        <p className="text-gray-500 text-sm line-clamp-1">{item.explanation}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderStory = () => (
      <div className="min-h-screen bg-pop-pink p-6 text-white flex flex-col">
          <div className="flex items-center justify-between mb-8">
              <button onClick={() => setView(AppView.NOTEBOOK)} className="bg-black/20 p-2 rounded-full"><IconArrowLeft /></button>
              <h2 className="font-display font-bold text-2xl">AI Story Time</h2>
              <div className="w-6"></div>
          </div>
          
          <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 overflow-y-auto">
              {storyLoading ? (
                  <div className="h-full flex flex-col items-center justify-center animate-pulse">
                      <IconStory className="w-16 h-16 mb-4 opacity-50" />
                      <p>Weaving your words into a tale...</p>
                  </div>
              ) : (
                  <div className="prose prose-invert prose-lg">
                      <div className="whitespace-pre-wrap leading-relaxed">{generatedStory}</div>
                  </div>
              )}
          </div>
          
          {!storyLoading && (
            <button onClick={handleStoryTime} className="mt-6 bg-white text-pop-pink font-bold py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2">
                <IconRefresh /> Generate New Story
            </button>
          )}
      </div>
  );

  const renderFlashcards = () => {
    const card = notebook[flashcardIndex];
    if(!card) return null;

    return (
        <div className="min-h-screen bg-pop-dark flex flex-col items-center justify-between p-6 pb-12">
            <div className="w-full flex justify-between items-center text-white mb-4">
                 <button onClick={() => setView(AppView.NOTEBOOK)} className="p-2"><IconArrowLeft /></button>
                 <span className="font-display font-bold text-xl">{flashcardIndex + 1} / {notebook.length}</span>
                 <div className="w-6"></div>
            </div>

            {/* Flashcard Container */}
            <div className="w-full max-w-sm aspect-[3/4] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-center text-center border-4 border-white">
                        <div className="w-40 h-40 rounded-full overflow-hidden mb-8 border-4 border-pop-yellow shadow-inner">
                            {card.imageUrl ? <img src={card.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200"></div>}
                        </div>
                        <h2 className="text-4xl font-display font-bold text-pop-dark mb-4">{card.word}</h2>
                        <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Tap to flip</p>
                    </div>

                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden bg-pop-purple rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center rotate-y-180 border-4 border-pop-purple text-white">
                        <h3 className="text-2xl font-bold mb-6">{card.explanation}</h3>
                        <div className="bg-white/10 rounded-xl p-4 w-full text-sm italic mb-6">
                            "{card.examples[0].target}"
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handlePlayTTS(card.word); }}
                            className="bg-white text-pop-purple p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <IconVolume className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-6 mt-8 w-full max-w-sm">
                <button 
                  disabled={flashcardIndex === 0}
                  onClick={() => { setFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
                  className="flex-1 bg-white/10 text-white font-bold py-4 rounded-2xl disabled:opacity-30">
                  Prev
                </button>
                <button 
                  disabled={flashcardIndex === notebook.length - 1}
                  onClick={() => { setFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
                  className="flex-1 bg-pop-yellow text-pop-dark font-bold py-4 rounded-2xl disabled:opacity-30">
                  Next
                </button>
            </div>
        </div>
    );
  };

  return (
    <>
      {view === AppView.SETUP && renderSetup()}
      {view === AppView.SEARCH && renderSearch()}
      {view === AppView.RESULT && renderResult()}
      {view === AppView.NOTEBOOK && renderNotebook()}
      {view === AppView.STORY && renderStory()}
      {view === AppView.FLASHCARDS && renderFlashcards()}
    </>
  );
}
