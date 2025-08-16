import React from "react"

export default function CatalogModal({open, onClose}){
  return (
    <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white transform ${open ? "translate-x-0" : "translate-x-full"} transition-transform duration-300 z-50 shadow-2xl`}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="font-semibold">Каталог</div>
        <button onClick={onClose} className="text-xl">?</button>
      </div>
      <div className="p-4 overflow-auto h-full">
        {Array.from({length: 30}).map((_,i)=>(
          <div key={i} className="py-3 border-b flex justify-between items-center">
            <div>Товар {i+1}</div>
            <div>›</div>
          </div>
        ))}
      </div>
    </div>
  )
}
