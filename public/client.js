(() => {
  const h = React.createElement;
  const E = (type, props, ...children) => h(type, props || {}, ...children.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false));
  const fixture = window.ME_ACTIVITY_DEMO ? window.ME_ACTIVITY_DATA : null;
  const nav = ["Overview","My Wallets","My Assets","Received","Sent","Rewards","Staking","Transactions","Analytics","Reports","Settings"];
  const glyph = {Overview:"OV","My Wallets":"WL","My Assets":"AS",Received:"IN",Sent:"OUT",Rewards:"RW",Staking:"ST",Transactions:"TX",Analytics:"AN",Reports:"RP",Settings:"SE"};
  const titleMap = {Overview:"Your financial story","My Wallets":"My wallets","My Assets":"Asset portfolio",Received:"Received",Sent:"Sent",Rewards:"Rewards",Staking:"Staking",Transactions:"Transactions",Analytics:"Analytics",Reports:"Reports",Settings:"Settings"};
  const descriptionMap = {Overview:"A read-only view across your verified Meta Earth activity.","My Wallets":"Addresses associated with your ME ID and their synchronization coverage.","My Assets":"Balances and activity by network-qualified asset identity.",Received:"Incoming activity, kept separate by asset and wallet.",Sent:"Outgoing activity, kept separate by asset and wallet.",Rewards:"Reward events reported by verified chain evidence.",Staking:"Deposits, withdrawals, positions and staking rewards.",Transactions:"Search and filter your indexed on-chain history.",Analytics:"Compare activity over time without mixing asset units.",Reports:"Create an export of the financial activity available to this account.",Settings:"Identity authorization, privacy and read-only preferences."};
  const fmtDate = value => { const date=new Date(value); return Number.isNaN(+date)?value:date.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"}); };
  const fmtCount = value => String(value ?? "—");

  function Chart({kind="line",data,compact=false}) {
    const ref=React.useRef(null);
    React.useEffect(()=>{
      if(!window.Chart||!ref.current||!data)return;
      const scales=kind==="doughnut"?{}:{
        x:{grid:{display:false},ticks:{color:"#777",font:{size:10}},border:{display:false}},
        y:{grid:{color:"#2c2c2c"},ticks:{color:"#777",font:{size:10},maxTicksLimit:5},border:{display:false}}
      };
      const options={
        responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
        plugins:{legend:{display:kind!=="doughnut",position:"bottom",labels:{color:"#929292",boxWidth:8,boxHeight:8,usePointStyle:true,padding:18,font:{family:"DM Sans",size:10}}},tooltip:{backgroundColor:"#111",borderColor:"#444",borderWidth:1,titleColor:"#fff",bodyColor:"#ccc",padding:10}},
        scales,...(kind==="doughnut"?{cutout:"72%"}:{})
      };
      const chart=new window.Chart(ref.current.getContext("2d"),{type:kind,data,options});
      return ()=>chart.destroy();
    },[kind,data]);
    return E("div",{className:`chart-wrap${compact?" small":""}`},E("canvas",{ref,"aria-label":`${kind} financial activity chart`,role:"img"}));
  }

  function Stat({label,value,note,icon,good=false}) {
    return E("div",{className:"card stat-card"},E("div",{className:"stat-top"},label,E("span",{className:"stat-ico"},icon)),E("div",{className:"stat-value"},fmtCount(value)),E("div",{className:`stat-note${good?" good":""}`},note));
  }

  function TransactionTable({rows}) {
    if(!rows.length)return E("div",{className:"empty"},E("strong",null,"No matching activity"),"Change the filters or connect an authorized ME PASS account.");
    const headers=["Date","Activity","Asset","Amount","Wallet","Transaction","Status"];
    const body=rows.map((row,i)=>E("tr",{key:`${row.txHash}-${i}`},
      E("td",{className:"muted"},fmtDate(row.timestamp)),E("td",null,row.category),E("td",null,E("span",{className:"kind-chip"},row.asset)),
      E("td",{className:`mono ${row.direction==="in"?"positive":"negative"}`},row.amount),E("td",{className:"mono muted"},row.wallet),
      E("td",{className:"mono"},row.txHash),E("td",null,E("span",{className:"status"},row.status))));
    return E("div",{className:"table-wrap"},E("table",{className:"table"},E("thead",null,E("tr",null,headers.map(x=>E("th",{key:x},x)))),E("tbody",null,body)));
  }

  function AssetRows({rows}) {
    const headers=["Asset","Balance","Received","Sent"];
    return E("div",{className:"asset-list"},E("div",{className:"asset-header"},headers.map(x=>E("span",{key:x},x))),rows.map((asset,i)=>E("div",{className:"asset-row",key:asset.id||i},
      E("div",{className:"asset-name"},E("span",{className:"coin-icon"},asset.symbol?.slice(0,2)),E("span",null,E("strong",null,asset.name),E("small",null,`${asset.kind} · ${asset.verified?"Verified":"Unverified asset"}`))),
      E("div",{className:"align-right"},E("div",{className:"asset-value"},asset.balance),E("div",{className:"asset-sub"},asset.symbol)),
      E("div",{className:"align-right"},E("div",{className:"asset-value positive"},asset.received),E("div",{className:"asset-sub"},"received")),
      E("div",{className:"align-right"},E("div",{className:"asset-value negative"},asset.sent),E("div",{className:"asset-sub"},"sent"))
    )));
  }

  function App() {
    const [page,setPage]=React.useState("Overview");
    const [range,setRange]=React.useState("30 days");
    const [search,setSearch]=React.useState("");
    const [category,setCategory]=React.useState("All categories");
    const [assetKind,setAssetKind]=React.useState("All assets");
    const [modal,setModal]=React.useState(false);
    const [menu,setMenu]=React.useState(false);
    const [data,setData]=React.useState(fixture);
    const [apiState,setApiState]=React.useState("checking");
    const [reports,setReports]=React.useState([]);

    React.useEffect(()=>{
      fetch("/api/v1/health").then(r=>r.json()).then(v=>setApiState(v.status||"available")).catch(()=>setApiState("preview"));
      fetch("/api/v1/me/overview").then(r=>r.ok?r.json():null).then(v=>{if(v?.data)setData(v.data);else if(v)setData(v);}).catch(()=>{});
    },[]);

    const transactions=data?.transactions||[];
    const assets=data?.assets||[];
    const wallets=data?.wallets||[];
    const coverage=data?.coverage||{status:"unavailable",reason:"Connect through an approved identity integration to view coverage."};
    const days={"7 days":7,"30 days":30,"90 days":90,"1 year":365}[range];
    const dateCutoff=days?Date.now()-days*86400000:0;
    const filteredTransactions=transactions.filter(tx=>{
      const directionMatches=page==="Received"?tx.direction==="in":page==="Sent"?tx.direction==="out":true;
      const categoryMatches=category==="All categories"||tx.category.toLowerCase()===category.toLowerCase();
      const dateMatches=!dateCutoff||new Date(tx.timestamp).getTime()>=dateCutoff;
      return directionMatches&&categoryMatches&&dateMatches&&Object.values(tx).join(" ").toLowerCase().includes(search.toLowerCase());
    });
    const visibleAssets=assets.filter(asset=>assetKind==="All assets"||asset.kind.toLowerCase()===assetKind.toLowerCase());
    const monthly=data?.monthly||[];
    const activityChart={labels:monthly.map(x=>x.month),datasets:[
      {label:"Received · MEC",data:monthly.map(x=>x.received),borderColor:"#63dba3",backgroundColor:"#63dba31c",fill:true,tension:.38,pointRadius:2,borderWidth:2},
      {label:"Sent · MEC",data:monthly.map(x=>x.sent),borderColor:"#ff7272",backgroundColor:"#ff72721a",fill:true,tension:.38,pointRadius:2,borderWidth:2}
    ]};
    const fungible=assets.filter(asset=>asset.kind!=="NFT");
    const allocation={labels:fungible.map(x=>x.symbol),datasets:[{data:fungible.map((_,i)=>[64,27,9][i%3]),backgroundColor:["#dce83f","#7c8cff","#66d9a3"],borderWidth:0}]};

    const downloadCsv=rows=>{
      const safe=value=>{let text=String(value??"");if(/^[\s]*[=+@\-]/.test(text))text="'"+text;return `"${text.replaceAll('"','""')}"`;};
      const all=[["ME ACTIVITY REPORT","DEVELOPMENT SAMPLE"],["ME ID reference",data?.profile?.displayName||"Masked"],["Verification date",data?.profile?.verificationAt||"Unknown"],["Wallets included",wallets.filter(x=>x.verified).map(x=>x.address).join("; ")],["Networks covered",(data?.networks||[]).map(x=>x.id).join("; ")],["Reporting period","All available sample history"],["Coverage status",coverage.status],["Coverage note",coverage.reason],["Transaction count",rows.length],["Generated at",new Date().toISOString()],["Sample amounts","Display fixtures only; not raw chain token amounts"],["timestamp","network","wallet","category","asset","sample_display_amount","transaction_hash","status"],...rows.map(x=>[x.timestamp,"mechain_400-1",x.wallet,x.category,x.asset,x.amount,x.txHash,x.status])];
      const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([all.map(row=>row.map(safe).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));link.download="me-activity-demo-report.csv";link.click();URL.revokeObjectURL(link.href);
    };
    const createReport=async(format="csv")=>{
      try{
        const response=await fetch("/api/v1/me/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"complete-history",format})});
        if(!response.ok)throw new Error((await response.json()).error||"Report service unavailable");
        const report=await response.json();
        const link=document.createElement("a");link.href=report.downloadUrl;link.download=format==="pdf"?"me-activity-report.pdf":"me-activity-report.csv";link.click();
        setReports(rows=>[{name:report.name,created:new Date().toISOString(),status:"Ready · expires in 15 min"},...rows]);
      }catch(error){
        if(!fixture){window.alert(error.message);return;}
        if(format==="pdf")window.print();else downloadCsv(transactions);
        setReports(rows=>[{name:`Financial history · ${format.toUpperCase()}`,created:new Date().toISOString(),status:"Demo preview"},...rows]);
      }
    };

    const pageHead=E("div",{className:"page-head"},E("div",null,E("div",{className:"eyebrow"},"Meta Earth · read only"),E("h1",{className:"page-title"},titleMap[page]),E("p",{className:"page-desc"},descriptionMap[page])),
      ["Overview","Analytics"].includes(page)?E("div",{className:"head-tools"},E("select",{className:"select",value:range,onChange:event=>setRange(event.target.value)},["7 days","30 days","90 days","1 year","All time"].map(x=>E("option",{key:x},x)))):null);

    const overview=()=>E(React.Fragment,null,
      E("div",{className:"coverage-banner"},E("span",null,E("strong",null,`HISTORY COVERAGE · ${String(coverage.status).toUpperCase()}`)," · ",coverage.reason||"Historical coverage is not yet confirmed."),E("button",{onClick:()=>setPage("Settings")},"Coverage details →")),
      E("div",{className:"grid stats"},
        E(Stat,{label:"Verified wallets",value:wallets.filter(w=>w.verified).length,note:`${wallets.length} discovered in this demo`,icon:"W"}),
        E(Stat,{label:"Networks covered",value:data?.networks?.length||0,note:"Hub / Rollup discovery pending",icon:"N"}),
        E(Stat,{label:"Current MEC balance",value:assets.find(a=>a.symbol==="MEC")?.balance||"—",note:"Current state · not lifetime total",icon:"M",good:true}),
        E(Stat,{label:"Rewards identified",value:data?.rewards?.length||0,note:"Evidence-based classification",icon:"R"})),
      E("div",{className:"grid two-col"},
        E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Monthly activity"),E("div",{className:"card-note"},"MEC only · no cross-asset totals")),E("span",{className:"kind-chip"},range)),E(Chart,{data:activityChart})),
        E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Asset allocation"),E("div",{className:"card-note"},"NFTs excluded · illustrative sample")),E("span",{className:"kind-chip"},"By asset")),fungible.length?E(Chart,{kind:"doughnut",data:allocation,compact:true}):E("div",{className:"empty"},"No asset data"),E(AssetRows,{rows:assets.slice(0,3)}))),
      E("section",{className:"card",style:{marginTop:14}},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Recent activity"),E("div",{className:"card-note"},"Successful and classified sample events")),E("button",{className:"text-btn",onClick:()=>setPage("Transactions")},"All transactions →")),E(TransactionTable,{rows:transactions.slice(0,5)}))
    );

    const walletsView=()=>{
      const headers=["Address","Network","Associated","Ownership","Sync","Last block"];
      const rows=wallets.map(wallet=>E("tr",{key:wallet.id},E("td",{className:"wallet-address"},wallet.address),E("td",null,wallet.network),E("td",{className:"muted"},wallet.associationDate),E("td",null,E("span",{className:`status${wallet.verified?"":" warn"}`},wallet.verified?"Verified":"Not verified")),E("td",null,E("span",{className:`status${wallet.sync==="Demo"?" neutral":"warn"}`},wallet.sync)),E("td",{className:"mono muted"},wallet.lastBlock)));
      return E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Wallet registry"),E("div",{className:"card-note"},"Only proof-verified addresses count toward ME ID totals.")),E("span",{className:"kind-chip"},`${wallets.filter(w=>w.verified).length} verified`)),E("div",{className:"table-wrap"},E("table",{className:"table"},E("thead",null,E("tr",null,headers.map(x=>E("th",{key:x},x)))),E("tbody",null,rows))));
    };

    const assetsView=()=>E("div",{className:"grid two-col"},
      E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Discovered assets"),E("div",{className:"card-note"},"Identity is network + denom / contract, not ticker alone.")),E("select",{className:"select",value:assetKind,onChange:event=>setAssetKind(event.target.value)},["All assets","Native","Fungible","NFT","Staking","Bridged","Unknown"].map(x=>E("option",{key:x},x)))),E(AssetRows,{rows:visibleAssets})),
      E("section",{className:"card note-card"},E("strong",null,"Asset verification"),E("p",null,"Unknown assets remain visible as unverified. NFT balances are shown separately and do not enter fungible-token financial totals."),E("strong",null,"Fiat valuation"),E("p",null,"No fiat prices are shown. A price needs a reliable source, asset mapping and timestamp before it can be included."),E("strong",null,"Network-qualified IDs"),E("p",{className:"mono"},assets.map(asset=>E("span",{key:asset.id,style:{display:"block"}},asset.id)))));

    const transactionView=()=>E("section",{className:"card"},E("div",{className:"table-tools"},E("div",{className:"filters"},E("input",{className:"search",placeholder:"Search hash, asset, wallet…",value:search,onChange:event=>setSearch(event.target.value)}),E("select",{className:"select",value:category,onChange:event=>setCategory(event.target.value)},["All categories",...new Set(transactions.map(x=>x.category))].map(x=>E("option",{key:x},x))),E("select",{className:"select",value:range,onChange:event=>setRange(event.target.value)},["7 days","30 days","90 days","1 year","All time"].map(x=>E("option",{key:x},x)))),E("span",{className:"kind-chip"},`${filteredTransactions.length} records`)),E(TransactionTable,{rows:filteredTransactions}));

    const rewardsView=()=>E("div",{className:"grid two-col"},E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Reward history"),E("div",{className:"card-note"},"Reward classifications require matching chain evidence."))),E(TransactionTable,{rows:transactions.filter(tx=>tx.category.toLowerCase().includes("reward"))})),E("section",{className:"card note-card"},E("strong",null,"Accounting note"),E("p",null,"Rewards are tracked separately from ordinary receipts and must not be counted twice. Live reward event mapping still needs validation against official module schemas and chain fixtures."),E("span",{className:"status warn"},"Live source pending")));

    const stakingView=()=>{
      const rows=(data?.staking||[]).map(row=>({timestamp:row.date,category:row.type,asset:row.asset,amount:row.amount,wallet:"—",txHash:"—",status:row.status,direction:row.type==="Deposit"?"out":"in"}));
      return E("div",{className:"grid two-col"},E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Staking activity"),E("div",{className:"card-note"},"HUB staking queries are documented by the official SDK."))),E(TransactionTable,{rows})),E("section",{className:"card note-card"},E("strong",null,"Read-only scope"),E("p",null,"This application never deposits, withdraws, claims, or signs. Positions and rewards require a live authorized query adapter and network-specific reconciliation."),E("span",{className:"status warn"},"Demo fixtures")));
    };

    const analyticsView=()=>E(React.Fragment,null,E("div",{className:"grid stats"},
      E(Stat,{label:"Received transactions",value:transactions.filter(x=>x.direction==="in").length,note:"Selected sample window",icon:"IN",good:true}),E(Stat,{label:"Sent transactions",value:transactions.filter(x=>x.direction==="out").length,note:"Selected sample window",icon:"OUT"}),E(Stat,{label:"Assets discovered",value:assets.length,note:"NFT reported separately",icon:"AS"}),E(Stat,{label:"Active wallets",value:wallets.filter(w=>w.verified).length,note:"Verified wallets only",icon:"WL"})),E("div",{className:"grid two-col"},
      E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Received vs sent"),E("div",{className:"card-note"},"MEC sample series · units are not mixed"))),E(Chart,{data:activityChart})),E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},"Portfolio mix"),E("div",{className:"card-note"},"Sample allocation, not market value"))),E(Chart,{kind:"doughnut",data:allocation,compact:true}),E("div",{className:"note-card"},"Price source: none · No estimated fiat totals"))));

    const reportsView=()=>{
      const cards=[["Complete financial history","CSV · wallet activity and per-asset totals"],["Received & sent","Filter by date, wallet, asset and direction"],["Rewards & staking","Separate reward and staking records"],["Portfolio snapshot","Balances, unknown assets and coverage"]];
      return E(React.Fragment,null,E("div",{className:"coverage-banner"},E("span",null,E("strong",null,"REPORT STATUS")," · Exports reflect available indexed history. Sample exports contain illustrative rows."),E("span",{className:"kind-chip"},"CSV available")),
        E("div",{className:"grid two-col three-col"},cards.map(([title,description])=>E("div",{className:"card report-card",key:title},E("span",{className:"report-icon"},"CSV"),E("h3",null,title),E("p",null,description),E("div",{className:"report-actions"},E("button",{onClick:()=>createReport("csv")},fixture?"Download CSV":"Request CSV"),E("button",{onClick:()=>createReport("pdf")},fixture?"Print / PDF":"Request PDF"))))),
        reports.length?E("section",{className:"card",style:{marginTop:14}},E("div",{className:"card-head"},E("h2",{className:"card-title"},"Recent report requests")),reports.map((report,i)=>E("div",{className:"settings-row",key:i},E("div",null,E("strong",null,report.name),E("small",null,new Date(report.created).toLocaleString())),E("span",{className:"status neutral"},report.status)))):null,
        E("section",{className:"card note-card",style:{marginTop:14}},E("strong",null,"Pricing and payments"),E("p",null,"The configured report request charge is exactly 0.01 MEC. Live payment, generation and download remain disabled until a verified destination and chain verifier are approved. Daily Premium pricing is unset.")));
    };

    const settingsView=()=>{
      const identityRows=[["ME PASS connection","Official third-party QR / OAuth protocol not documented","Unavailable"],["ME ID verification","Exact verification timestamp is not exposed by the reviewed public API","Pending"],["Wallet ownership","Only ME PASS or cryptographic/on-chain proof can verify an address","Not connected"],["Session security","No live account session is active in this preview","Signed out"]];
      const coverageRows=[["Coverage status",coverage.status],["Earliest indexed block",coverage.earliestIndexedBlock||"—"],["Latest indexed block",coverage.latestIndexedBlock||"—"],["Requested start",coverage.requestedFrom||"—"],["Last successful sync","Not connected"]];
      const section=(title,note,rows)=>E("section",{className:"card"},E("div",{className:"card-head"},E("div",null,E("h2",{className:"card-title"},title),E("div",{className:"card-note"},note))),rows.map(([name,value,status])=>E("div",{className:"settings-row",key:name},E("div",null,E("strong",null,name),status?E("small",null,value):null),E("span",{className:status?"status warn":"kind-chip"},status||value))));
      return E("div",{className:"grid two-col"},section("Identity & access","No private keys or wallet passwords are requested.",identityRows),E("div",null,section("History coverage","Missing data is not treated as zero activity.",coverageRows),E("div",{className:"admin-lock",style:{marginTop:14}},"Admin controls require verified server-side administrator authorization.")));
    };

    const content=page==="Overview"?overview():page==="My Wallets"?walletsView():page==="My Assets"?assetsView():["Received","Sent","Transactions"].includes(page)?transactionView():page==="Rewards"?rewardsView():page==="Staking"?stakingView():page==="Analytics"?analyticsView():page==="Reports"?reportsView():settingsView();
    const navigation=E("aside",{className:`sidebar${menu?" open":""}`},E("div",{className:"brand"},E("div",{className:"brand-mark"},"ME"),E("div",null,E("div",{className:"brand-name"},"ME ACTIVITY"),E("div",{className:"brand-sub"},"FINANCIAL INTELLIGENCE"))),E("div",{className:"nav-label"},"Workspace"),E("nav",{className:"nav-list"},nav.map(item=>E("button",{className:`nav-item${page===item?" active":""}`,key:item,onClick:()=>{setPage(item);setMenu(false);}},E("span",{className:"nav-glyph"},glyph[item]),item))),E("div",{className:"nav-foot"},E("div",{className:"network-pill"},E("span",{className:"dot"}),fixture?"ME Testnet · Demo":"Network status · Offline"),E("div",{className:"coverage-side"},`History coverage · ${coverage.status||"pending"}`)));
    const topbar=E("header",{className:"topbar"},E("div",{style:{display:"flex",alignItems:"center",gap:12}},E("button",{className:"menu-toggle",onClick:()=>setMenu(!menu),"aria-label":"Open navigation"},"☰"),E("div",{className:"crumb"},"ME ACTIVITY / ",E("b",null,page))),E("div",{className:"top-actions"},fixture?E("span",{className:"demo-tag"},"DEVELOPMENT SAMPLE"):null,E("button",{className:"connect",onClick:()=>setModal(true)},"Connect with ME PASS")));
    const modalView=modal?E("div",{className:"modal-backdrop",onClick:event=>{if(event.target===event.currentTarget)setModal(false);}},E("section",{className:"modal","aria-modal":"true",role:"dialog"},E("div",{className:"eyebrow"},"Secure identity connection"),E("h2",null,"ME PASS authorization is not available yet"),E("p",null,"The reviewed official material describes ME PASS identity management, but does not publish a supported third-party OAuth, QR authorization, issuer or permission contract for this app."),E("div",{className:"warning"},"No QR is generated and no wallet permissions are requested. This stays disabled until Meta Earth documents an authorized integration."),E("div",{className:"modal-actions"},E("button",{className:"secondary-btn",onClick:()=>setModal(false)},"Close"),E("a",{href:"https://docs.mec.me/",target:"_blank",rel:"noreferrer",className:"secondary-btn",style:{textDecoration:"none"}},"Official docs")))):null;
    return E("div",{className:"shell"},navigation,E("main",{className:"main"},topbar,pageHead,content,E("div",{className:"footer-note"},`READ-ONLY · ${fixture?"ALL DISPLAYED FINANCIAL FIGURES ARE DEVELOPMENT FIXTURES":"NO VERIFIED FINANCIAL DATA LOADED"} · SERVICE ${apiState.toUpperCase()}`)),modalView);
  }
  ReactDOM.createRoot(document.getElementById("root")).render(E(App));
})();
