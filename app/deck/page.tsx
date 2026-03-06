import { getDeck } from "@/lib/deck";

export default function DeckPage() {
  const deck = getDeck();
  const firstThree = deck.cards.slice(0, 3);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">牌库验证</h1>
      <p className="text-sm text-slate-300">
        总卡数：<span className="font-mono">{deck.cards.length}</span>
      </p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 text-sm text-slate-400">前 3 张牌：</div>
        <ul className="space-y-1 text-sm">
          {firstThree.map((card) => (
            <li key={card.id} className="font-mono">
              <span className="text-tarot-accent">{card.id}</span> —{" "}
              <span>{card.name}</span>{" "}
              <span className="text-slate-400">({card.arcana})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

