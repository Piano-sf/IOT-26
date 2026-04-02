import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 🔥 1. ใส่ Gemini API Key ตรงนี้
const genAI = new GoogleGenerativeAI("AIzaSyBL4aG8mciMioQ0TLTwNA5okRcQdKs6fpk");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); 

export default function VetChatbot({ sensors, lastVisit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "สวัสดีค่ะ! ฉันคือ Pawsitive AI ผู้ช่วยสัตวแพทย์ประจำกระบะทราย มีอะไรให้ฉันช่วยวิเคราะห์สุขภาพน้องแมวไหมคะ?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // เลื่อนหน้าจอแชทลงมาล่างสุดอัตโนมัติเวลาพิมพ์
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      // 🔥 2. สร้าง System Prompt + ยัดข้อมูล Sensor สดๆ (Prompt Injection)
      const prompt = `
        คุณคือ "Pawsitive AI" เป็นสัตวแพทย์ผู้เชี่ยวชาญด้านแมว และเป็นผู้ช่วยในแอปกระบะทรายอัจฉริยะ
        จงตอบคำถามด้วยความสุภาพ เป็นกันเอง และสั้นกระชับ (ไม่เกิน 3-4 ประโยค)
        
        [ข้อมูลเซนเซอร์กระบะทราย ณ วินาทีนี้]:
        - อุณหภูมิ: ${sensors.temp} °C
        - ความชื้น: ${sensors.hum} %
        - ก๊าซแอมโมเนีย (ยิ่งสูงยิ่งมีกลิ่น): ${sensors.ammonia} ppm
        - การทำงานของพัดลม: ${sensors.fan ? 'กำลังเปิดดูดกลิ่น' : 'ปิดอยู่'}
        - ฉี่สเปรย์เรี่ยราด: ${sensors.spray ? 'ตรวจพบ!' : 'ปกติ'}
        - การเข้าห้องน้ำครั้งล่าสุด: ${lastVisit ? `ใช้เวลา ${lastVisit.duration} นาที` : 'ยังไม่มีข้อมูล'}

        คำถามจากเจ้าของแมว: "${userMessage}"
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { role: "bot", text: responseText }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: "bot", text: "ขออภัยค่ะ ระบบ AI ขัดข้องชั่วคราว ลองถามใหม่อีกครั้งนะคะ" }]);
    } finally {
      setIsLoading(true);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ปุ่มลอยมุมขวาล่าง */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50"
      >
        <MessageCircle size={24} className="animate-pulse" />
      </button>

      {/* หน้าต่างแชท */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
            style={{ height: "500px" }}
          >
            {/* Chat Header */}
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <Bot size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pawsitive Vet AI</h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-slate-700" : "bg-emerald-500/20"}`}>
                    {msg.role === "user" ? <User size={12} className="text-slate-300" /> : <Bot size={12} className="text-emerald-400" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[75%] text-sm ${
                    msg.role === "user" ? "bg-emerald-500 text-slate-950 rounded-tr-sm" : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={12} className="text-emerald-400" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700/50 rounded-tl-sm flex gap-1">
                    <span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span><span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="ถามเรื่องสุขภาพน้องแมว..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-xl flex items-center justify-center transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}