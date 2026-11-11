"use client";

import { useState, useEffect } from "react";
import { Library, Plus, Trash2, ArrowRight } from "lucide-react";

type CardStatus = "Idea" | "Scripting" | "Filming" | "Published";

interface Card {
  id: string;
  topic: string;
  status: CardStatus;
  score: number;
  date: string;
}

const COLUMNS: CardStatus[] = ["Idea", "Scripting", "Filming", "Published"];

export default function LibraryPage() {
  const [items, setItems] = useState<Card[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("content_pipeline");
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      // Default empty state
      setItems([]);
    }
  }, []);

  const saveToStorage = (newItems: Card[]) => {
    setItems(newItems);
    localStorage.setItem("content_pipeline", JSON.stringify(newItems));
  };

  const moveCard = (id: string, newStatus: CardStatus) => {
    const updated = items.map(item => item.id === id ? { ...item, status: newStatus } : item);
    saveToStorage(updated);
  };

  const deleteCard = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    saveToStorage(updated);
  };

  const getNextStatus = (current: CardStatus): CardStatus | null => {
    const idx = COLUMNS.indexOf(current);
    if (idx >= 0 && idx < COLUMNS.length - 1) return COLUMNS[idx + 1];
    return null;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 font-sans max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-10 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Library className="text-blue-500" /> Content Pipeline (Kanban)
          </h2>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm font-medium">Manage your video production workflow from Idea to Published.</p>
        </div>
      </div>

      <p className="md:hidden text-xs text-gray-400 font-medium mb-3 flex items-center gap-1.5">
        <span>👉</span> Geser ke samping untuk melihat kolom status lainnya
      </p>

      <div className="flex md:grid overflow-x-auto pb-4 gap-4 md:gap-6 md:grid-cols-4 snap-x snap-mandatory">
        {COLUMNS.map(column => (
          <div key={column} className="w-[84vw] sm:w-[320px] md:w-auto shrink-0 md:shrink bg-gray-50/50 border border-gray-100 rounded-3xl p-4 flex flex-col h-[65vh] md:h-[70vh] snap-center">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{column}</h3>
              <span className="bg-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                {items.filter(i => i.status === column).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {items.filter(i => i.status === column).map(item => {
                const nextStatus = getNextStatus(item.status);
                return (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50 group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-gray-400">{item.date}</span>
                      <button onClick={() => deleteCard(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm leading-tight text-gray-900 mb-3">{item.topic}</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                        🔥 Score: {item.score}
                      </div>
                      {nextStatus && (
                        <button 
                          onClick={() => moveCard(item.id, nextStatus)}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                        >
                          Move <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {items.filter(i => i.status === column).length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-xs font-medium text-gray-400">
                  No items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
