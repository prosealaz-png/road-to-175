// Shared plan data: used by the page (inlined by build.py) and by the sync Worker (concatenated by build.py).
// Pure data + functions, no DOM, no timezone assumptions beyond 'dates are calendar days'.
globalThis.PLAN = (function(){
const START = new Date(2026,9,7);               // Wed Oct 7 2026 (Week 0)
const W1 = new Date(2026,9,12);                 // Mon Oct 12 2026 (Week 1)
const END = new Date(2027,0,14);                // Thu Jan 14 2027 (test)
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const key = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const fmt = d => DOW[(d.getDay()+6)%7]+' '+MON[d.getMonth()]+' '+d.getDate();
function weekOf(d){ if (d < W1) return 0; return Math.floor((d - W1)/864e5/7)+1; }
function dowOf(d){ return (d.getDay()+6)%7; }

// ---------- plan content ----------
const PHASES = [
  {n:1, name:'Foundations', range:'Oct 7 – Nov 1 (Weeks 0–3)', goal:'Learn the method cold. Accuracy first, with loose 40–45 minute section budgets so you can feel what finishing is like. Diagnostic + one full practice test. Target by Nov 1: 162–164, blanks down to 3 per section.'},
  {n:2, name:'Timing ladder', range:'Nov 2 – Dec 6 (Weeks 4–8)', goal:'Section budgets shrink one notch a week: 40 → 38 → 36 → 35 → 35. The skip rule becomes automatic. One full practice test every Saturday. Target by Dec 6: 167–169, zero blanks.'},
  {n:3, name:'Test mode', range:'Dec 7 – Jan 3 (Weeks 9–12)', goal:'Two full 4-section tests a week (Tuesday + Saturday), each with a real blind review. Drills only on your top miss type. Target by Jan 3: 171–174.'},
  {n:4, name:'Taper', range:'Jan 4 – Jan 14 (Weeks 13–14)', goal:'One final test, then volume drops by half. Sleep on the test-day schedule. Walk in rested with an index card of your five personal traps. Target: 173–176.'}
];
const WEEK_GOALS = {
  0:'Set up, take the diagnostic, start the two books. Nothing timed except the diagnostic.',
  1:'Translation + argument parts (Loophole). VIEWSTAMP and passage structure (RC Bible). First feel for 40-min sections.',
  2:'Loophole: CLIR, Must Be True, Most Strongly Supported, Flaw. First full practice test Saturday. Target 161–163.',
  3:'Loophole: Strengthen/Weaken, Necessary + Sufficient Assumption. RC Bible: comparative reading. Blanks under 3 per section.',
  4:'Ladder step 1: 40-minute sections with the skip rule on every single question. Practice test Saturday, target 164.',
  5:'Ladder step 2: 38-minute sections. Hit the LR checkpoints (Q10 by 12 min). Practice test Saturday, target 165.',
  6:'Ladder step 3: 36-minute sections. RC passage checkpoints (8.5 min each). Practice test Saturday, target 166.',
  7:'Ladder step 4: real 35-minute sections. Thanksgiving week, lighter Thursday. Practice test Saturday, target 167.',
  8:'Hold 35 minutes. Zero blanks on every section this week. Practice test Saturday, target 168–169.',
  9:'Test mode begins: Tuesday + Saturday full tests with a 4th experimental section. Target 170.',
  10:'Two tests. Drill only your top miss type. Target 171–172.',
  11:'Christmas week: two tests still, but the 25th is a full rest day. Target 172–173.',
  12:'New Year week: two tests, New Year’s Day off. Target 173+.',
  13:'Taper: final full test Tuesday, then half volume. Lock sleep to test-day timing. Confirm logistics.',
  14:'Test week. Short warm-ups only. Thursday: go get it.'
};
const MONTHS = [
  {name:'October 2026', goal:'Method installed. Diagnostic taken, two books mostly read, untimed accuracy above 90% on LR drills, one full practice test logged. Blanks per section: 3 or fewer.', target:'162–164'},
  {name:'November 2026', goal:'The clock stops being the enemy. Timing ladder from 40 to 35 minutes, five practice tests, skip rule automatic. Blanks per section: zero.', target:'167–169'},
  {name:'December 2026', goal:'Test mode. Eight full tests with real blind reviews, 4 sections each. Consistency: no section below -4.', target:'171–174'},
  {name:'January 2027', goal:'Taper, sleep, index card, test. Then a nap you have earned.', target:'173–176'}
];
const PT_TARGETS = [['Oct 8 diagnostic',160],['Oct 24',162],['Nov 7',164],['Nov 14',165],['Nov 21',166],['Nov 28',167],['Dec 5',168],['Dec 8',169],['Dec 12',170],['Dec 15',171],['Dec 19',171],['Dec 22',172],['Dec 26',172],['Dec 29',173],['Jan 2',173],['Jan 5 final',174]];

const T = (t,m) => ({t,m});
const LADDER = {4:40,5:38,6:36,7:35,8:35};
const LOOP_A = {1:'Loophole: Translation + Argument Parts (premise vs conclusion)',2:'Loophole: CLIR (Conclusion, Loophole, Implication, Reasoning) + Must Be True',3:'Loophole: Strengthen + Weaken'};
const LOOP_B = {1:'Loophole: Powerful vs Provable',2:'Loophole: Most Strongly Supported + Flaw',3:'Loophole: Necessary + Sufficient Assumption'};
const RCB = {1:'RC Bible: VIEWSTAMP + passage structure',2:'RC Bible: question types + prephrasing the answer',3:'RC Bible: comparative reading + hard science passages'};

function tasksFor(d){
  const k = key(d), w = weekOf(d), dow = dowOf(d);
  if (d < START || d > END) return [];
  // fixed special days
  const special = {
    '2026-10-07':[T('Read this whole plan once, top to bottom. Tap the Setup tab and read the pacing rules.',15), T('LSAT Demon: confirm subscription, turn on explanations, set a daily goal.',15), T('Register for the January LSAT on LSAC.org and put the date in Setup.',20)],
    '2026-10-08':[T('Diagnostic practice test on Demon: 4 sections, timed strictly, no pausing.',180), T('Write down blanks per section and where the clock was at Q10 / Q15 / Q20.',10)],
    '2026-10-09':[T('Blind review the diagnostic: re-answer every flagged question untimed, then check.',90), T('Log the score in the Scores tab.',2)],
    '2026-10-10':[T('Loophole: intro + Translation chapter.',60), T('RC Bible: intro + the approach chapter.',45)],
    '2026-10-11':[T('Rest day. Pick your weekday study window and block it in your calendar.',10)],
    '2026-11-26':[T('Thanksgiving. 10 LR questions on your phone, then go eat.',15)],
    '2026-12-25':[T('Christmas. Zero LSAT today. Koen loves you.',0)],
    '2026-12-31':[T('New Year’s Eve: one LR section at 35 min, review misses, done by noon.',70)],
    '2027-01-01':[T('New Year’s Day. Rest. You are two weeks out and ahead of where you started by a mile.',0)],
    '2027-01-11':[T('Easy warm-up: one LR section at 35 min. Confidence, not grind.',35), T('Read your index card of five traps.',5)],
    '2027-01-12':[T('One RC section at 35 min, review misses only.',55), T('Pack everything: ID, admission ticket, water, snacks, charger, quiet room sorted.',20)],
    '2027-01-13':[T('10 easy LR questions. That is all.',15), T('Phone off by 9pm. Bed at test-week bedtime.',0)],
    '2027-01-14':[T('TEST DAY. Breakfast, 5 easy LR questions as a warm-up, then go get your 175. Koen loves you.',0)]
  };
  if (special[k]) return special[k];

  if (w >= 1 && w <= 3) { // Foundations
    const sat2 = w === 2;
    return [
      [T(LOOP_A[w]+'.',60), T('Demon: 15 LR questions untimed on the type you just read. Review every one with the explanation.',60)],
      [T(RCB[w]+'.',45), T('Demon: 2 RC passages untimed. Write the main point in one sentence before touching the questions.',60)],
      [T('Demon: 1 LR section, 45-minute budget. Note the clock at Q10 and Q20.',45), T('Review: for every miss, write why the right answer is right AND why yours is wrong.',45)],
      [T(LOOP_B[w]+'.',45), T('Demon: 10 LR questions on your weakest type, untimed.',45)],
      [T('Demon: 1 RC section, 45-minute budget. Passage checkpoints at 11 min each.',45), T('Review misses.',30), T('Update your trap list (the ways you get fooled).',15)],
      sat2 ? [T('Full practice test, 4 sections, timed strictly, start at 8:30am.',180), T('Log the score and blanks per section.',5)]
           : [T('2 timed sections back to back (LR + RC), 40 minutes each.',80), T('Blind review both before checking answers.',60)],
      sat2 ? [T('Blind review the practice test: every flagged question untimed first.',90), T('Weekly reflection, 3 lines: what slowed you, what clicked, next week’s one focus.',10)]
           : [T('Rest. Weekly reflection, 3 lines: what slowed you, what clicked, next week’s one focus.',10)]
    ][dow];
  }
  if (w >= 4 && w <= 8) { // Timing ladder
    const m = LADDER[w];
    return [
      [T(`Demon: 1 LR section at ${m} min with the skip rule (75 sec, pick, flag, move).`,m), T('Review every flagged + missed question.',45), T('Loophole: reread the chapter for your weakest type.',30)],
      [T(`Demon: 1 RC section at ${m} min. Passage checkpoint: ${(m/4).toFixed(1)} min each.`,m), T('Review: for each miss, find the line in the passage that proves the right answer.',40)],
      [T('Speed day: 25 LR questions in 30 minutes. Finish no matter what.',30), T('Review misses only.',30)],
      [T(`Demon: 1 LR section at ${m} min. Hit the checkpoints (Q10 by 12, Q18 by 23).`,m), T('Review flagged + missed.',40), T('RC Bible: one chapter on your weakest RC question type.',30)],
      [T('Light: 15 mixed LR questions in 18 minutes.',20), T('2 RC passages in 17 minutes.',20), T('Update your trap list.',10)],
      [T('Full practice test, 4 sections, strict time, start 8:30am like test day.',180), T('Log score + blanks per section.',5)],
      [T('Blind review the practice test, flagged questions first.',120), T('Weekly reflection, 3 lines.',10)]
    ][dow];
  }
  if (w >= 9 && w <= 12) { // Test mode
    return [
      [T('Full blind review of Saturday’s test. Log it.',120)],
      [T('Full practice test, 4 sections (add an experimental), strict time.',180), T('Log score + blanks.',5)],
      [T('Full blind review of Tuesday’s test.',120), T('Demon: 10 questions on your single top miss type.',20)],
      [T('2 timed sections back to back (LR + RC) at 35 min.',70), T('Review flagged + missed.',45)],
      [T('Light: 1 LR section at 35 min.',35), T('Review misses.',30)],
      [T('Full practice test at test-day time, 4 sections.',180), T('Log score + blanks.',5)],
      [T('Rest. Weekly reflection, 3 lines.',10), T('Read through your trap list once.',10)]
    ][dow];
  }
  if (w === 13) { // Taper
    return [
      [T('Blind review Saturday’s test. Log it.',120)],
      [T('FINAL full practice test, 4 sections, test-day timing.',180), T('Log score.',5)],
      [T('Review the final test.',60), T('Write your 5 personal traps on one index card. This is your test-day cheat sheet (in your head).',30)],
      [T('1 LR + 1 RC section at 35 min.',70), T('Review misses only.',30)],
      [T('15 LR questions + 2 RC passages, timed.',40), T('Logistics check: LSAC account, ID, test location or remote setup, check-in time.',30)],
      [T('2 sections at your test-day start time.',70), T('Review misses only. No new material from here on.',20)],
      [T('Rest. Walk. Bed at test-week bedtime.',0)]
    ][dow];
  }
  return [];
}

// all days
const DAYS = [];
for (let d = new Date(START); d <= END; d = addDays(d,1)) {
  const ts = tasksFor(d).map((t,i)=>({id:key(d)+'#'+i, ...t}));
  DAYS.push({date:new Date(d), k:key(d), week:weekOf(d), tasks:ts});
}
const ALL = DAYS.flatMap(x=>x.tasks);

return {START,W1,END,DOW,MON,key,addDays,fmt,weekOf,dowOf,PHASES,WEEK_GOALS,MONTHS,PT_TARGETS,tasksFor,DAYS,ALL};
})();
