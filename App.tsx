
import React, { useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type Transaction = {
  id: string;
  date: string;            // YYYY-MM-DD
  description: string;
  category: string;
  amount: number;          // negative = expense, positive = income
  accountId: string;
};

type Account = {
  id: string;
  name: string;            // e.g., Robinhood, Chase
  type: "Brokerage" | "Checking" | "Savings" | "Credit";
  balance: number;
};

/** ---------- Helpers ---------- */
function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Project growth (simple yearly comp) */
function projectGrowth(start:number, yearlyAdd:number, years:number, rate:number){
  const pts:{year:number; value:number}[] = [];
  let v = start;
  for (let y=0; y<=years; y++){
    if (y>0) v = (v + yearlyAdd) * (1 + rate);
    pts.push({year: new Date().getFullYear() + y, value: v});
  }
  return pts;
}

/** SVG Area/Line chart (no external libs) with hover tooltip */
function AreaChart({
  series,
  onHoverIndexChange
}:{
  series:{name:string;color:string;points:{year:number;value:number}[]}[];
  onHoverIndexChange?:(i:number|null)=>void;
}){
  const years = series[0].points.map(p=>p.year);
  const all = series.flatMap(s=>s.points.map(p=>p.value));
  const min = 0;
  const max = Math.max(...all) * 1.05 || 1;
  const W=900, H=320, P=30;

  const x = (i:number)=> P + (i/(years.length-1))*(W-2*P);
  const y = (v:number)=> H-P - (v-min)/(max-min||1)*(H-2*P);
  const path = (pts:{year:number;value:number}[]) =>
    pts.map((p,i)=> `${i===0 ? "M":"L"} ${x(i)} ${y(p.value)}`).join(" ");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverI, setHoverI] = useState<number|null>(null);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const innerLeft = P, innerRight = W - P;
    const clamped = Math.max(innerLeft, Math.min(innerRight, mx));
    const t = (clamped - innerLeft) / (innerRight - innerLeft);
    const idx = Math.round(t * (years.length - 1));
    setHoverI(idx);
    onHoverIndexChange?.(idx);
  }
  function handleLeave() {
    setHoverI(null);
    onHoverIndexChange?.(null);
  }

  const legendIndex = hoverI ?? (years.length - 1);

  return (
    <div style={{position:"relative"}}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="320"
        role="img"
        aria-label="projection chart"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{touchAction:"none", cursor:"crosshair"}}
      >
        {/* grid */}
        <g opacity="0.18" stroke="var(--border)">
          {Array.from({length:6}).map((_,i)=>{
            const yy = P + i*((H-2*P)/5);
            return <line key={i} x1={P} x2={W-P} y1={yy} y2={yy} />;
          })}
        </g>
        {/* filled areas */}
        {series.map((s,i)=>{
          const d = path(s.points) + ` L ${x(s.points.length-1)} ${H-P} L ${x(0)} ${H-P} Z`;
          return <path key={i} d={d} fill={s.color} opacity="0.16" />;
        })}
        {/* lines */}
        {series.map((s,i)=> <path key={i} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.5} />)}

        {/* hover vertical + dots */}
        {hoverI!==null && (
          <>
            <line x1={x(hoverI)} x2={x(hoverI)} y1={P} y2={H-P}
              stroke="var(--border)" strokeDasharray="4 4" />
            {series.map((s,i)=>{
              const v = s.points[hoverI].value;
              return (
                <circle key={i} cx={x(hoverI)} cy={y(v)} r={4.5} fill={s.color} stroke="white" strokeWidth={1.5}/>
              );
            })}
          </>
        )}

        {/* x labels */}
        <g fill="var(--muted)" fontSize="12">
          {years.map((yr,i)=> <text key={yr} x={x(i)} y={H-6} textAnchor="middle">{yr}</text>)}
        </g>
      </svg>

      {/* Tooltip */}
      {hoverI!==null && (
        <div
          style={{
            position:"absolute",
            left:`calc(${( ( (P + (hoverI/(years.length-1))*(W-2*P)) )/W)*100}% + 10px)`,
            top: 12,
            padding:"8px 10px",
            background:"var(--panel-2)",
            border:"1px solid var(--border)",
            borderRadius:10,
            boxShadow:"0 6px 18px rgba(0,0,0,0.25)",
            pointerEvents:"none",
            minWidth:180
          }}
        >
          <div style={{fontSize:12, color:"var(--muted)", marginBottom:6}}>
            Year {years[hoverI]}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"auto 1fr auto", rowGap:4, columnGap:8, alignItems:"center"}}>
            {series.map(s=>(
              <FragmentRow key={s.name} color={s.color} label={s.name} val={money(s.points[hoverI!].value)} />
            ))}
          </div>
        </div>
      )}

      {/* Legend with small numbers (current hover or last values) */}
      <div style={{display:"flex", gap:16, marginTop:6, flexWrap:"wrap"}}>
        {series.map(s=>(
          <div key={s.name} style={{display:"flex", alignItems:"center", gap:8, fontSize:13}}>
            <span style={{width:10, height:10, borderRadius:2, background:s.color, display:"inline-block"}}/>
            <span style={{color:"var(--muted)"}}>{s.name}</span>
            <strong style={{fontVariantNumeric:"tabular-nums"}}>{money(s.points[legendIndex].value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentRow({color,label,val}:{color:string;label:string;val:string}){
  return (
    <>
      <span style={{width:8, height:8, background:color, display:"inline-block", borderRadius:2}}/>
      <span style={{color:"var(--muted)"}}>{label}</span>
      <span style={{fontWeight:700}}>{val}</span>
    </>
  );
}

/** ---------- App ---------- */
export default function App(){
  /* Left nav */
  const [leftTab, setLeftTab] = useState<"dashboard"|"accounts"|"transactions"|"budgets">("dashboard");

  /* Data (local state; swap for API/DB later) */
  const [accounts, setAccounts] = useState<Account[]>([
    { id:"acc1", name:"Robinhood", type:"Brokerage", balance:10000 },
    { id:"acc2", name:"Chase",     type:"Checking",  balance: 5000 },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id:"t1", date: todayISO(), description:"Initial Balance", category:"Setup", amount:10000, accountId:"acc1" },
    { id:"t2", date: todayISO(), description:"Initial Balance", category:"Setup", amount: 5000, accountId:"acc2" },
  ]);

  const totalBalance = useMemo(()=>accounts.reduce((s,a)=>s+a.balance,0), [accounts]);

  /* Add Transaction modal state */
  const [showTxModal, setShowTxModal] = useState(false);
  const [newTx, setNewTx] = useState<{desc:string; category:string; amount:string; accountId:string}>({
    desc:"", category:"", amount:"", accountId:"acc1"
  });

  function addTransaction(){
    const amt = Number(newTx.amount);
    if (!newTx.desc.trim() || Number.isNaN(amt)) return;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: todayISO(),
      description: newTx.desc.trim(),
      category: newTx.category.trim() || "General",
      amount: amt,
      accountId: newTx.accountId,
    };
    setTransactions(prev => [tx, ...prev]);

    // update account balance
    setAccounts(prev => prev.map(a => a.id === newTx.accountId ? { ...a, balance: a.balance + amt } : a));

    setShowTxModal(false);
    setNewTx({ desc:"", category:"", amount:"", accountId:"acc1" });
  }

  /** DELETE Transaction (also reverse account balance impact) */
  function deleteTransaction(id: string){
    setTransactions(prev => {
      const tx = prev.find(t => t.id === id);
      if (!tx) return prev;
      // reverse the impact on the account: subtract the original amount
      setAccounts(accs => accs.map(a => a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a));
      return prev.filter(t => t.id !== id);
    });
  }

  /* Portfolio "View details" modal */
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  /** Only invested balance (exclude checking) */
  const investedBalance = useMemo(
    () => accounts.filter(a=>a.type==="Brokerage").reduce((s,a)=>s+a.balance,0),
    [accounts]
  );

  const years = 10;
  const conservative = projectGrowth(investedBalance, 0, years, 0.04);
  const moderate    = projectGrowth(investedBalance, 0, years, 0.06);
  const aggressive  = projectGrowth(investedBalance, 0, years, 0.09);

  /* Dashboard sample sparkline (for the main card) */
  const spark = [12,14,13,16,18,17,19,21,22,20,24,26,28,27,29,31,33,32,36,38];

  /* For modal legend & stat cards to track hover */
  const [hoverYearIndex, setHoverYearIndex] = useState<number|null>(null);

  const legendI = hoverYearIndex ?? years; // 0..years, years means last
  const lastIdx = Math.min(Math.max(legendI, 0), conservative.length-1);

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><strong>Finance Tracker</strong></div>
        <nav className="menu">
          <button className={leftTab==="dashboard"?"active":""} onClick={()=>setLeftTab("dashboard")}>🏠 Dashboard</button>
          <button className={leftTab==="accounts"?"active":""} onClick={()=>setLeftTab("accounts")}>💼 Accounts</button>
          <button className={leftTab==="transactions"?"active":""} onClick={()=>setLeftTab("transactions")}>📄 Transactions</button>
          <button className={leftTab==="budgets"?"active":""} onClick={()=>setLeftTab("budgets")}>📊 Budgets</button>
        </nav>
        <div className="spacer" />
        <div className="foot">v0.1.0 • local</div>
      </aside>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="search">
          <span>🔎</span>
          <input placeholder="Search transactions, tickers, accounts…" style={{background:"transparent",border:"none",outline:"none",color:"var(--text)",width:"100%"}}/>
        </div>
        <div className="actions">
          <button className="btn" onClick={()=>setShowTxModal(true)}>+ Add Transaction</button>
          <button className="btn">⚙️ Settings</button>
        </div>
      </header>

      {/* MAIN */}
      <main className="main">
        {leftTab==="dashboard" && (
          <Dashboard
            totalBalance={totalBalance}
            spark={spark}
            onViewPortfolio={()=>setShowPortfolioModal(true)}
            transactions={transactions}
            onDeleteTx={deleteTransaction}
          />
        )}

        {leftTab==="accounts" && (<AccountsTab accounts={accounts} />)}

        {leftTab==="transactions" && (<TransactionsTab txs={transactions} onDeleteTx={deleteTransaction} />)}

        {leftTab==="budgets" && (<BudgetsTab />)}
      </main>

      {/* ADD TRANSACTION MODAL */}
      {showTxModal && (
        <div className="modal-backdrop" onClick={()=>setShowTxModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <h3>Add Transaction</h3>
            <input className="input" placeholder="Description" value={newTx.desc}
              onChange={e=>setNewTx({...newTx, desc:e.target.value})}/>
            <input className="input" placeholder="Category" value={newTx.category}
              onChange={e=>setNewTx({...newTx, category:e.target.value})}/>
            <input className="input" placeholder="Amount (negative = spend)" type="number"
              value={newTx.amount} onChange={e=>setNewTx({...newTx, amount:e.target.value})}/>
            <select className="input" value={newTx.accountId}
              onChange={e=>setNewTx({...newTx, accountId:e.target.value})}>
              {accounts.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div style={{display:"flex", justifyContent:"flex-end", gap:10}}>
              <button className="btn" onClick={()=>setShowTxModal(false)}>Cancel</button>
              <button className="btn primary" onClick={addTransaction}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* PORTFOLIO DETAILS MODAL */}
      {showPortfolioModal && (
        <div className="modal-backdrop" onClick={()=>setShowPortfolioModal(false)}>
          <div className="modal" style={{width:980}} onClick={(e)=>e.stopPropagation()}>
            <h3>Portfolio Value — 10-Year Projection (Invested Funds Only)</h3>
            <div className="chartbox" style={{marginTop:8}}>
              <AreaChart
                series={[
                  { name:"Conservative", color:"#7c7cff", points: conservative },
                  { name:"Moderate",     color:"#53c1a9", points: moderate },
                  { name:"Aggressive",   color:"#d17bff", points: aggressive },
                ]}
                onHoverIndexChange={setHoverYearIndex}
              />
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:12}}>
              <div className="card">
                <h3>Conservative</h3>
                <div className="value">
                  {money(conservative[lastIdx].value)}
                </div>
              </div>
              <div className="card">
                <h3>Moderate</h3>
                <div className="value">
                  {money(moderate[lastIdx].value)}
                </div>
              </div>
              <div className="card">
                <h3>Aggressive</h3>
                <div className="value">
                  {money(aggressive[lastIdx].value)}
                </div>
              </div>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, color:"var(--muted)"}}>
              <div>
                Starting invested balance: <strong>{money(investedBalance)}</strong>
              </div>
              <div>
                {hoverYearIndex!==null ? `Year: ${conservative[hoverYearIndex].year}` :
                  `Year: ${conservative.at(-1)!.year}`}
              </div>
            </div>
            <div style={{display:"flex", justifyContent:"flex-end", marginTop:12}}>
              <button className="btn" onClick={()=>setShowPortfolioModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ---------- Dashboard ---------- */
function Dashboard({
  totalBalance,
  spark,
  onViewPortfolio,
  transactions,
  onDeleteTx
}:{
  totalBalance: number;
  spark: number[];
  onViewPortfolio: ()=>void;
  transactions: Transaction[];
  onDeleteTx: (id:string)=>void;
}){
  return (
    <div className="section">
      {/* KPI row */}
      <div className="grid">
        <div className="card" style={{gridColumn:"span 3"}}>
          <h3>Total Balance</h3>
          <div className="kpi">
            <div className="value" style={{color:"var(--good)"}}>{money(totalBalance)}</div>
          </div>
        </div>
        <div className="card" style={{gridColumn:"span 3"}}>
          <h3>YTD Return</h3>
          <div className="kpi">
            <div className="value">+7.4%</div>
            <div className="delta up">+0.3% (mtd)</div>
          </div>
        </div>
        <div className="card" style={{gridColumn:"span 3"}}>
          <h3>Cash</h3>
          <div className="kpi">
            <div className="value">{money(Math.max(0, totalBalance - 10000))}</div>
            <div className="delta down">demo</div>
          </div>
        </div>
        <div className="card" style={{gridColumn:"span 3"}}>
          <h3>Monthly Spend</h3>
          <div className="kpi">
            <div className="value">{money(
              -transactions.filter(t=>t.amount<0).slice(0,30).reduce((s,t)=>s+t.amount,0)
            )}</div>
            <div className="delta down">30d</div>
          </div>
        </div>
      </div>

      {/* Middle row */}
      <div className="grid">
        <div className="card" style={{gridColumn:"span 8"}}>
          <Header title="Portfolio Value" action={<button className="btn" onClick={onViewPortfolio}>View details</button>} />
          <Sparkline data={spark} />
        </div>
        <div className="card" style={{gridColumn:"span 4"}}>
          <Header title="Cash Flow (30d)" />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12, marginTop:6}}>
            <MiniStat label="Income" value={money(transactions.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0))} dir="up" />
            <MiniStat label="Expenses" value={money(-transactions.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0))} dir="down" />
            <MiniStat label="Invested" value={money(0)} dir="up" />
            <MiniStat label="Savings" value={money(0)} dir="up" />
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <Header title="Recent Transactions" action={<a href="#" style={{color:"var(--accent)", fontSize:12}}>See all</a>} />
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Category</th>
              <th style={{textAlign:"right"}}>Amount</th>
              <th style={{width:70}}></th>
            </tr>
          </thead>
        <tbody>
            {transactions.slice(0,10).map((r)=>(
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.description}</td>
                <td><span className="badge">{r.category}</span></td>
                <td style={{textAlign:"right", color: r.amount<0 ? "var(--bad)":"var(--good)"}}>
                  {r.amount<0 ? "-" : "+"}{money(Math.abs(r.amount))}
                </td>
                <td style={{textAlign:"right"}}>
                  <button
                    className="btn"
                    onClick={()=> {
                      if (confirm("Delete this transaction?")) onDeleteTx(r.id);
                    }}
                    title="Delete transaction"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header({title, action}:{title:string; action?:React.ReactNode}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <h3 style={{margin:0, color:"var(--muted)"}}>{title}</h3>
      {action}
    </div>
  );
}

function MiniStat({label,value,dir}:{label:string;value:string;dir:"up"|"down"}){
  return (
    <div style={{background:"var(--panel-2)",border:"1px solid var(--border)",borderRadius:12,padding:10}}>
      <div style={{color:"var(--muted)",fontSize:12}}>{label}</div>
      <div style={{fontWeight:700,marginTop:2}}>{value} <span style={{fontSize:12,color:dir==="up"?"var(--good)":"var(--bad)"}}>
        {dir==="up"?"▲":"▼"}
      </span></div>
    </div>
  );
}

function Sparkline({data}:{data:number[]}){
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 540, h = 36;
  const pts = data.map((v,i)=>{
    const x = (i/(data.length-1))*w;
    const y = h - ((v-min)/(max-min||1))*h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height="36" preserveAspectRatio="none" role="img" aria-label="sparkline">
      <polyline points={pts} fill="none" stroke="url(#g)" strokeWidth="2"/>
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--good)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** ---------- Tabs ---------- */
function AccountsTab({ accounts }: { accounts: Account[] }) {
  return (
    <div className="section">
      <div className="grid">
        {accounts.map(acc => (
          <div key={acc.id} className="card" style={{ gridColumn: "span 4" }}>
            <h3>{acc.name}</h3>
            <div style={{color:"var(--muted)", marginBottom:8}}>{acc.type}</div>
            <div className="value">{money(acc.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTab({ txs, onDeleteTx }: { txs: Transaction[]; onDeleteTx:(id:string)=>void }) {
  return (
    <div className="section">
      <div className="card">
        <h3>All Transactions</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Category</th>
              <th style={{textAlign:"right"}}>Amount</th>
              <th style={{width:70}}></th>
            </tr>
          </thead>
          <tbody>
            {txs.map(t=>(
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.description}</td>
                <td>{t.category}</td>
                <td style={{textAlign:"right", color:t.amount<0?"var(--bad)":"var(--good)"}}>
                  {t.amount<0?"-":"+"}{money(Math.abs(t.amount))}
                </td>
                <td style={{textAlign:"right"}}>
                  <button
                    className="btn"
                    onClick={()=> {
                      if (confirm("Delete this transaction?")) onDeleteTx(t.id);
                    }}
                    title="Delete transaction"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetsTab() {
  const [budgets, setBudgets] = useState(
    [
      { category: "Groceries", limit: 500, spent: 320 },
      { category: "Dining",    limit: 200, spent: 180 },
      { category: "Investments", limit: 1000, spent: 1000 },
    ].map((b, i)=> ({ id:String(i+1), ...b }))
  );

  const total = budgets.reduce((s,b)=>s+b.limit,0);
  const used = budgets.reduce((s,b)=>s+b.spent,0);
  const [newRow, setNewRow] = useState({ category:"", limit:"", spent:"" });

  function updateField(id:string, key:"category"|"limit"|"spent", value:string){
    setBudgets(prev => prev.map(b=>{
      if (b.id!==id) return b;
      if (key==="category") return {...b, category: value};
      const num = Number(value);
      if (Number.isNaN(num)) return b;
      return {...b, [key]: num};
    }));
  }

  function addRow(){
    if (!newRow.category.trim()) return;
    const lim = Number(newRow.limit||0);
    const sp  = Number(newRow.spent||0);
    setBudgets(prev => [...prev, { id: crypto.randomUUID(), category:newRow.category.trim(), limit: lim, spent: sp }]);
    setNewRow({ category:"", limit:"", spent:"" });
  }

  function removeRow(id:string){
    setBudgets(prev => prev.filter(b=>b.id!==id));
  }

  return (
    <div className="section">
      <div className="card">
        <h3>Monthly Budgets</h3>
        <p style={{color:"var(--muted)"}}>
          Total {used.toLocaleString("en-US",{style:"currency",currency:"USD"})} of{" "}
          {total.toLocaleString("en-US",{style:"currency",currency:"USD"})} used
        </p>

        <table className="table">
          <thead><tr><th>Category</th><th>Spent</th><th>Limit</th><th>% Used</th><th></th></tr></thead>
          <tbody>
            {budgets.map((b)=> {
              const pct = b.limit>0 ? Math.round((b.spent/b.limit)*100) : 0;
              return (
                <tr key={b.id}>
                  <td>
                    <input
                      className="input"
                      value={b.category}
                      onChange={e=>updateField(b.id,"category",e.target.value)}
                      style={{width:180}}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={String(b.spent)}
                      onChange={e=>updateField(b.id,"spent",e.target.value)}
                      style={{width:120, color:b.spent>b.limit?"var(--bad)":"var(--text)"}}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={String(b.limit)}
                      onChange={e=>updateField(b.id,"limit",e.target.value)}
                      style={{width:120}}
                    />
                  </td>
                  <td>
                    <div style={{
                      background:"var(--panel-2)",borderRadius:6,overflow:"hidden",height:8,width:120
                    }}>
                      <div style={{
                        height:"100%",width:`${Math.min(pct,100)}%`,
                        background:pct>100?"var(--bad)":"var(--good)"
                      }}/>
                    </div>
                    <span style={{marginLeft:6,color:"var(--muted)",fontSize:12}}>{pct}%</span>
                  </td>
                  <td style={{textAlign:"right"}}>
                    <button className="btn" onClick={()=>removeRow(b.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {/* Add new row */}
            <tr>
              <td>
                <input className="input" placeholder="Category" value={newRow.category}
                  onChange={e=>setNewRow({...newRow, category:e.target.value})} style={{width:180}}/>
              </td>
              <td>
                <input className="input" type="number" placeholder="Spent" value={newRow.spent}
                  onChange={e=>setNewRow({...newRow, spent:e.target.value})} style={{width:120}}/>
              </td>
              <td>
                <input className="input" type="number" placeholder="Limit" value={newRow.limit}
                  onChange={e=>setNewRow({...newRow, limit:e.target.value})} style={{width:120}}/>
              </td>
              <td colSpan={2} style={{textAlign:"right"}}>
                <button className="btn primary" onClick={addRow}>+ Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
