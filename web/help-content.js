// Original, concise explanations tied to this engine's field identifiers.
// Entries describe the local preview; examples are illustrative, not financial advice.
import {worksheetNames} from './journal.js';
export const HELP={};
const add=(id,title,meaning,example,steps,tip='')=>HELP[id]={id,title,meaning,example,steps,tip,group:id.split('.')[0]};
const enter='Type the value, then ENTER to save it. Use ↑ / ↓ to move between fields.';
const solve='Enter the known fields with ENTER. Move to the unknown field and press CPT.';
const auto='Enter the worksheet inputs first. Use ↓ to reach this field; its result is calculated automatically.';
const set='Press 2ND → ENTER (SET) to change this choice. Use ↓ to continue.';

add('AMORT.P1','First payment in the range','The payment number where your loan breakdown starts. It is a payment count, not a date.','For the first year of monthly payments, set P1=1 and P2=12.',enter,'First set your loan’s TVM values and calculate PMT. A range must start at 1 or later.');
add('AMORT.P2','Last payment in the range','The final payment included in the breakdown. Both P1 and P2 are included.','P1=13 and P2=24 isolates the second year of monthly payments.',enter,'P2 must be at least P1. Pressing CPT on P1 or P2 advances to the next range of the same size.');
add('AMORT.BAL','Remaining loan balance','The balance remaining just after the last payment in your selected range.','Use P2=36 to inspect the balance after payment 36.',auto,'Amortization uses your TVM settings and the displayed decimal precision to round payments.');
add('AMORT.PRN','Principal paid','The part of the selected payments that reduces the amount borrowed.','Compare PRN for payments 1–12 with PRN for payments 13–24.',auto,'Cash-flow signs follow your loan entries. A negative amount can represent money you paid.');
add('AMORT.INT','Interest paid','The interest portion of the payments from P1 through P2.','Set a one-year payment range to see how much of that year’s payments goes to interest.',auto,'PRN and INT split the same payment range. Check the range and payment frequency before comparing totals.');
add('PYCY.PY','Payments per year','How many scheduled payments occur each year in a TVM calculation.','For monthly payments, enter 12; for quarterly payments, enter 4.',enter,'Changing P/Y also sets C/Y to the same value. Change C/Y afterward if compounding differs.');
add('PYCY.CY','Compounding periods per year','How often interest compounds each year for TVM. This can differ from payment frequency.','For monthly payments with semiannual compounding, set P/Y=12, then C/Y=2.',enter,'I/Y remains an annual nominal percentage. Do not also divide it by 12 when P/Y handles monthly periods.');
add('BGN.timing','When payments happen','END places payments at each period’s end. BGN places them at each period’s beginning.','Rent paid at the start of each month is a beginning-payment example.',set,'BGN stays visible on the calculator when beginning payments are selected.');

add('CF.CF0','Starting cash flow','The amount paid or received now, before the first future period.','An initial outlay of 800 is CF0=−800. Later receipts are positive.',enter,'Keep one viewpoint throughout: money you pay is negative; money you receive is positive.');
add('CF.C','Cash-flow amount','A future payment or receipt, occurring at the end of a regularly spaced period.','If you receive 90 for three consecutive periods, enter C01=90 and F01=3.',enter,'Unequal amounts are fine, but periods must be equally spaced. Include zero flows for periods with no payment.');
add('CF.F','Consecutive repetitions','How many periods in a row use the preceding cash-flow amount.','C02=150 with F02=4 means four consecutive receipts of 150.',enter,'This is a repeat count, not payments per year. Use a whole number from 1 to 9999.');
add('NPV.I','Discount rate per period','The percentage used to translate each future cash flow into a value today.','If flows occur annually and your comparison rate is 8%, enter I=8.',enter,'Match the rate’s period to the cash flows. This worksheet does not use TVM’s P/Y or C/Y settings.');
add('NPV.NPV','Net present value','The starting cash flow plus all future cash flows discounted to today at I.','With CF0=−100, one receipt of 110, and I=10, NPV is 0.', 'Enter cash flows with CF. Open NPV, enter I, press ↓ to NPV, then CPT.','A positive result means the modeled cash flows exceed the chosen discount-rate benchmark. It is not a guarantee about an investment.');
add('IRR.IRR','Internal rate of return','A rate per cash-flow period that makes net present value equal zero.','Pay 100 now and receive 110 one period later: IRR is 10% for that period.','Enter the schedule with CF, then press IRR → CPT.','You need positive and negative flows. Repeated sign changes can produce multiple rates; the preview may return only one. A solver error does not always prove there is no mathematical solution.');

add('BOND.SDT','Settlement date','The date the bond purchase is settled. Interest calculations start from this point.','Use a purchase settlement date before the bond’s redemption date.',enter,'Enter dates as mm.ddyy in US mode or dd.mmyy in EUR mode, then ENTER.');
add('BOND.CPN','Annual coupon rate','The stated annual interest paid by the bond, as a percent of face value.','A 4% coupon on 100 face value pays 4 per year, split across the coupon payments.',enter,'Enter 4 for 4%, not 0.04. Coupon rate and yield are different.');
add('BOND.RDT','Redemption date','The date the bond pays its redemption amount.','For a maturity calculation, use the maturity date.',enter,'Redemption must be after settlement. For a call calculation, use consistent call date and redemption value.');
add('BOND.RV','Redemption value','The amount repaid at redemption, quoted per 100 of face value.','Enter 100 for repayment at par; 102 represents repayment at 102% of face value.',enter);
add('BOND.basis','Bond day-count basis','ACT uses actual calendar days. 360 uses a 30/360 convention for coupon-period fractions.','Choose the day-count convention stated in the bond’s terms.',set,'This setting affects accrued interest and price.');
add('BOND.frequency','Coupon payments per year','Whether the bond pays one or two coupons each year.','A semiannual coupon bond uses 2/Y.',set,'This is separate from TVM’s payment frequency.');
add('BOND.YLD','Annual bond yield','The annualized discount rate consistent with the bond’s price and scheduled payments.','Enter a quoted price to calculate its implied yield.',solve,'Price and yield move in opposite directions for otherwise unchanged cash flows.');
add('BOND.PRI','Bond price per 100','The quoted price excluding accrued interest, per 100 of face value.','PRI=97 means a quoted price of 970 for 1,000 face value, before accrued interest.',solve,'For the amount including accrued interest, add AI to PRI before scaling by face value.');
add('BOND.AI','Accrued interest','Interest accumulated since the last coupon date, quoted per 100 of face value.','If PRI=97 and AI=1, the total is 98 per 100 of face value.',auto);

add('DEPR.method','Depreciation method','The rule used to allocate an asset’s depreciable cost across its useful life.','SL spreads cost evenly; SYD and DB allocate more to earlier years.',set,'DBX switches from declining balance to straight line. For DB/DBX, enter the percentage factor, such as 200, then ENTER. French SLF/DBF results remain provisional in this preview.');
add('DEPR.LIF','Useful life','The number of years over which the asset is depreciated.','Use LIF=5 for an asset modeled over five years.',enter,'Use the life required by your exercise or accounting policy; this calculator does not choose it.');
add('DEPR.M01','Starting month','The month the asset starts depreciating in its first year.','M01=1 gives a full first year; M01=7 gives half a year.',enter,'Use a value from 1 up to, but not including, 13.');
add('DEPR.DT1','In-service date','The starting date used by the French straight-line method.','Enter the date the asset was placed in service.',enter,'This preview’s French depreciation methods are provisional. Check their documented limits before relying on them.');
add('DEPR.CST','Asset cost','The initial cost of the asset before depreciation.','For equipment costing 6,000, enter CST=6000.',enter,'Cost must be at least the salvage value.');
add('DEPR.SAL','Salvage value','The value assumed to remain after the useful life ends.','Cost 6,000 and salvage 1,000 leaves 5,000 to depreciate.',enter);
add('DEPR.YR','Year to inspect','Which year of the depreciation schedule to show.','YR=2 selects the second year.',enter,'CPT on YR advances to the next year.');
add('DEPR.DEP','Depreciation for the year','The amount of cost allocated to the selected year.','With full-year straight line, cost 6,000, salvage 1,000 and life 5 gives DEP=1,000.',auto);
add('DEPR.RBV','Remaining book value','The asset’s cost minus accumulated depreciation through the selected year.','A 6,000 asset with 1,000 total depreciation has RBV=5,000.',auto,'Book value is an accounting amount, not an estimate of resale price.');
add('DEPR.RDV','Remaining depreciable value','The part of the book value still available to depreciate, above salvage.','RBV=5,000 and SAL=1,000 leaves RDV=4,000.',auto);

add('DATA.X','X data value','A measured value, or the input side of an X/Y pair.','To study price versus quantity, X could be price and Y could be quantity.',enter,'In one-variable mode, X holds the observation and Y holds its frequency.');
add('DATA.Y','Y value or frequency','In two-variable statistics this is the paired Y measurement. In 1-V mode it is how often the X value occurs.','For one-variable data where X=8 occurs five times, enter Y=5.',enter,'Choose the statistics model with 2ND → 8 before interpreting Y.');
add('STAT.model','Statistics model','Choose one-variable summaries or a curve describing paired X/Y data.','LIN fits Y=a+bX. Ln fits Y=a+b ln(X). EXP fits Y=a·e^(bX). PWR fits Y=a·X^b.',set,'Choose 1-V for frequencies. Ln/PWR need positive X; EXP/PWR need positive Y. Enter observations in 2ND → 7 (DATA).');
add('STAT.n','Observation count','The number of observations included in the statistics. In 1-V mode, frequencies are added.','Three rows with frequencies 2, 3 and 1 give n=6 in 1-V mode.',auto);
for(const [axis,mean,sample,population,sum,square] of [['X','meanX','Sx','sigmaX','sumX','sumX2'],['Y','meanY','Sy','sigmaY','sumY','sumY2']]){
  add(`STAT.${mean}`,`Mean of ${axis}`,`The average of the ${axis} observations.`,`Values 2, 4 and 6 have a mean of 4.`,auto,'One-variable summaries use the entered frequencies as weights.');
  add(`STAT.${sample}`,`Sample standard deviation of ${axis}`,`How spread out ${axis} is, using the sample formula with n−1 in the denominator.`,`Use this when the observations represent a sample from a larger population.`,auto,'At least two observations are required. A value of zero means no variation.');
  add(`STAT.${population}`,`Population standard deviation of ${axis}`,`How spread out ${axis} is, using n in the denominator.`,`Use this to describe the entire set you treat as the population.`,auto,'Do not interchange sample and population standard deviations when an exercise specifies one.');
  add(`STAT.${sum}`,`Sum of ${axis}`,`All ${axis} observations added together.`,`For 2, 4 and 6, the sum is 12.`,auto);
  add(`STAT.${square}`,`Sum of squared ${axis}`,`Square each ${axis} value, then add those squares.`,`For 2 and 3, this is 4+9=13, not (2+3)².`,auto);
}
add('STAT.sumXY','Sum of paired products','Multiply X by Y within each pair, then add the products.','Pairs (2,3) and (4,5) give 2×3+4×5=26.',auto);
add('STAT.a','Regression constant','The constant in the selected regression equation. Its meaning depends on the model.','For LIN, Y=a+bX: a is the predicted Y when X=0.',auto,'For EXP and PWR, a is a multiplier. Check the selected model first.');
add('STAT.b','Regression coefficient','The coefficient controlling how the fitted equation changes with X.','For LIN, b=2 means predicted Y rises by 2 for each extra unit of X.',auto,'For nonlinear models, b is not a simple change in Y per unit of X.');
add('STAT.r','Correlation coefficient','A measure from −1 to 1 describing the direction and strength of the fitted linear relationship.','A value near +1 means the fitted variables move closely together.',auto,'For nonlinear models this uses transformed data. Correlation does not establish causation.');
add('STAT.X','Predicted X','The X value implied by a supplied Y and the selected regression equation.','After fitting a demand model, enter a target Y to estimate the corresponding X.',solve,'Enter Y′ first, then move to X′ and press CPT. Predictions outside your observed range may be unreliable.');
add('STAT.Y','Predicted Y','The Y value estimated from a supplied X and the selected regression equation.','Enter an X price to estimate Y quantity from your fitted model.',solve,'Enter X′ first, then move to Y′ and press CPT. Prediction is unavailable in 1-V mode.');

add('PERCENT_CHANGE.OLD','Starting value','The amount before growth or decline.','A value growing from 80 to 100 uses OLD=80 and NEW=100.',solve);
add('PERCENT_CHANGE.NEW','Ending value','The amount after the selected number of growth periods.','For 80 growing 25% over one period, NEW is 100.',solve);
add('PERCENT_CHANGE.CHANGE','Percent change per period','The repeated percentage growth or decline linking OLD to NEW.','OLD=100, NEW=121 and #PD=2 gives 10% per period.',solve,'For a single overall percentage change, set #PD=1.');
add('PERCENT_CHANGE.PERIODS','Number of growth periods','How many repeated percentage changes connect the starting and ending values.','At 10% per period, growing 100 to 121 takes two periods.',solve,'This is a count of periods, not a percentage.');
add('ICONV.NOM','Nominal annual rate','An annual rate quoted before accounting for compounding within the year.','NOM=12 with monthly compounding means 1% per month.',solve,'Enter percentages as 12 for 12%, not 0.12.');
add('ICONV.EFF','Effective annual rate','The equivalent annual percentage after allowing for within-year compounding.','NOM=12 and C/Y=12 produces about EFF=12.68%.',solve,'Use this to compare rates with different compounding frequencies on an annual basis.');
add('ICONV.CY','Compounds per year','The compounding count used for this interest-rate conversion.','Monthly compounding uses C/Y=12; quarterly uses 4.',enter,'This worksheet’s C/Y is separate from the TVM C/Y setting.');
add('DATE.DT1','First date','The starting date in a date-difference or date-shift calculation.','Use the start of a project as DT1 and its end as DT2.',solve,'Date entry is mm.ddyy in US mode and dd.mmyy in EUR mode.');
add('DATE.DT2','Second date','The ending date, or the date calculated by adding days to DT1.','Enter DT1 and DBD=30, then compute DT2 for the date 30 days later.',solve,'Computing an actual date uses ACT. The 360 setting is for day-count differences.');
add('DATE.DBD','Days between dates','The difference between DT1 and DT2 under the selected day-count basis.','Use two project dates to measure elapsed days.',solve,'Under ACT, reversing the dates reverses the sign.');
add('DATE.basis','Date day-count basis','ACT counts calendar days. 360 uses a financial 30/360 convention.','Choose ACT for actual elapsed days between two dates.',set,'A 30/360 day count is a convention, not a literal calendar duration.');
add('PROFIT.CST','Cost','The amount it costs to provide one item.','If an item costs 60 and sells for 80, the profit is 20.',solve);
add('PROFIT.SEL','Selling price','The revenue from selling one item.','With cost 60 and a target margin of 25%, the selling price is 80.',solve);
add('PROFIT.MAR','Profit margin','Profit as a percentage of the selling price.','Cost 60 and selling price 80 gives (80−60)/80=25%.',solve,'Margin divides by selling price. Markup divides by cost; they are not the same percentage.');
add('BREAKEVEN.FC','Fixed costs','Total costs that do not change with the number of units in this model.','Rent of 1,200 for the period is a fixed cost.',solve,'Use the same time period for fixed costs and target profit.');
add('BREAKEVEN.VC','Variable cost per unit','The cost added by producing or selling one more unit.','If each item requires 6 in materials, use VC=6.',solve);
add('BREAKEVEN.P','Price per unit','The revenue earned for each unit sold.','P=10 and VC=6 leaves 4 per unit toward fixed costs and profit.',solve);
add('BREAKEVEN.PFT','Target profit','The total profit you want after covering fixed and variable costs.','Set PFT=0 for the breakeven quantity.',solve,'A positive target requires more contribution than simply covering fixed costs.');
add('BREAKEVEN.Q','Quantity','The number of units needed or sold in the model.','FC=1200, VC=6, P=10 and PFT=0 gives Q=300.',solve,'A computed fraction may need rounding up when units must be whole. P must exceed VC to cover positive fixed costs at zero target profit.');
add('MEM.M','Memory register','A stored number in one of ten independent slots, M0 through M9.','Store a useful subtotal in M3, then inspect it later in this worksheet.',enter,'To store from the keypad, press STO then a digit. This preview uses Copy in the old RCL position; inspect memory with 2ND → 0.');
add('FORMAT.decimals','Display precision','How many decimal places to show. The stored number can retain more precision.','DEC=2 shows 1.23 for a stored 1.2345.',enter,'DEC=9 selects floating decimal display. ROUND is the separate operation that changes stored precision.');
add('FORMAT.angle','Angle units','DEG interprets trigonometric angles in degrees; RAD uses radians.','sin(30) is 0.5 in DEG, but sin(30 radians) is different.',set);
add('FORMAT.date','Date format','US uses month first; EUR uses day first. This affects date entry and display.','15 March 2027 is entered as 3.1527 in US or 15.0327 in EUR.',set);
add('FORMAT.separators','Number separators','Which marks separate thousands and decimal fractions in displayed numbers.','US shows 1,234.50; EUR shows 1.234,50.',set,'Changing separators does not change the stored value.');
add('FORMAT.calculation','Arithmetic order','CHAIN evaluates operations in entry order. AOS applies operator precedence.','2+3×4 gives 20 in CHAIN and 14 in AOS.',set,'Parentheses let you control grouping in either mode.');

add('KEY.SECOND','Secondary functions','2ND activates the small label above the next key you press.','2ND → PV opens AMORT, instead of assigning PV.','Press the key under the secondary label. Press 2ND again to cancel.','Opening Define leaves the pending 2ND selection intact.');
add('KEY.CPT','Compute an unknown','CPT asks the calculator to solve a field from the values already stored.','In an editable-and-computable field such as bond YLD, CPT solves for yield.','In a worksheet, move to the target before CPT. For TVM, press CPT and then the target key.','ENTER saves an input; CPT calculates an output.');
add('KEY.ENTER','Store a worksheet entry','ENTER commits the number on the display to the selected worksheet field.','In CF0, type −500 and press ENTER to store the initial outlay.','Use ↑ / ↓ to reach a field, type its value, then ENTER.','Typing a number alone does not commit a worksheet input.');
add('KEY.SET','Change a setting','SET cycles a choice such as BGN/END, a depreciation method, or CHAIN/AOS.','At payment timing, use SET to switch between END and BGN.','Press 2ND → ENTER while the setting is displayed.');
add('KEY.STO','Store a memory value','Saves the displayed value in a numbered memory slot.','To keep 125 in slot 3: display 125, press STO, then 3.','Choose one digit from 0 to 9 after STO. Inspect saved slots with 2ND → 0.','This does not store a TVM input; use its TVM key for that.');
add('KEY.ROUND','Round the stored number','Changes the actual stored value to the current display precision.','At DEC=2, ROUND changes 1.2345 to 1.23.','Press 2ND → STO (ROUND) on the value you want to round.','Unlike changing DEC, this loses extra stored digits. Undo can recover the prior entry in this session.');
add('KEY.PERCENT','Percent operation','Converts the entered number into a percentage for the pending arithmetic.','200 + 10 % = produces 220.','For an increase, enter amount + percentage %. For a reduction, use −. Finish with =.','For a full percent-change worksheet, use 2ND → 5.');
add('KEY.POWER','Raise to a power','Multiplies a base by itself the number of times specified by the exponent.','2 raised to 3 is 8.','Enter the base, press yˣ, enter the exponent, then =.');
add('KEY.SQRT','Square root','Finds the nonnegative number whose square equals your input.','√81 is 9.','Enter the value, then √x.','Negative inputs do not have a real square root.');
add('KEY.SQUARE','Square a value','Multiplies the current value by itself.','7² is 49.','Enter a value, then x².');
add('KEY.RECIPROCAL','Reciprocal','Divides 1 by the current value.','The reciprocal of 4 is 0.25.','Enter a nonzero value, then 1/x.');
add('KEY.LN','Natural logarithm','The power to which e must be raised to obtain your number.','ln(1)=0. Natural logs can help solve for a time or growth exponent.','Enter a positive value, then LN.','Use 2ND → LN for eˣ, the inverse operation.');
add('KEY.EXP','Exponential eˣ','Raises the constant e to the displayed power.','e⁰=1. It is useful in continuous-growth formulas.','Enter the exponent, then 2ND → LN.');
for(const [key,name,example] of [['SIN','Sine','sin(30°)=0.5'],['COS','Cosine','cos(60°)=0.5'],['TAN','Tangent','tan(45°)=1']])add(`KEY.${key}`,name,'A trigonometric function of an angle, using the selected DEG or RAD setting.',example,`Enter the angle, then 2ND → ${key==='SIN'?'(':key==='COS'?')':'yˣ'}.`,'Check the angle unit. INV selects the inverse function; HYP selects its hyperbolic counterpart.');
add('KEY.INV','Inverse trigonometry','Finds an angle from a sine, cosine, or tangent value.','In DEG, inverse sine of 0.5 returns 30.','Enter the ratio, press INV, then ( for sine, ) for cosine, or yˣ for tangent.','Inverse sine and cosine require a ratio from −1 to 1. This is different from 1/x.');
add('KEY.HYP','Hyperbolic functions','Selects sinh, cosh, or tanh, functions built from exponentials.','sinh(0)=0 and cosh(0)=1.','Enter the value, press 2ND → INV (HYP), then (, ), or yˣ.','These are not ordinary angle functions. Combine INV with HYP for inverse hyperbolic functions.');
add('KEY.FACTORIAL','Factorial','Multiplies all positive whole numbers up to the input.','5!=5×4×3×2×1=120.','Enter an integer from 0 to 69, then 2ND → ×.','0! is 1.');
add('KEY.NPR','Permutations','Counts selections where order matters.','Choosing an ordered pair from five distinct items gives 5 nPr 2=20.','Enter n, press 2ND → − (nPr), enter r, then =.','Use whole numbers with 0≤r≤n.');
add('KEY.NCR','Combinations','Counts selections where order does not matter.','Choosing two items from five gives 5 nCr 2=10.','Enter n, press 2ND → + (nCr), enter r, then =.','Use whole numbers with 0≤r≤n.');
add('KEY.RAND','Random number','Generates a pseudorandom value between 0 and 1.','Use it for a simple practice simulation.','Press 2ND → ÷ (RAND).','This deterministic generator is not suitable for passwords or security.');
add('KEY.K','Repeat a constant operation','Keeps an operation and operand for repeated calculations.','Apply the same increase to several values without retyping the operation.','Enter the starting value and an operation, press 2ND → %, enter the fixed operand, then =. Enter another starting value and = to reuse it.');
add('KEY.ANS','Last answer','Recalls the stored answer for use in a new calculation.','Reuse a calculated rate without retyping its rounded display.','Press 2ND → = (ANS).','Some value assignments also update this calculator’s last-answer register.');
add('KEY.XPY','Periods from years','Multiplies the displayed value by the TVM payments-per-year setting.','With P/Y=12, entering 5 then xP/Y gives 60 periods.','Enter years, press 2ND → N, then N to store the resulting period count.');
add('KEY.CLR_WORK','Clear the active worksheet','Resets the active worksheet’s values. Outside a worksheet, it clears the current calculation.','Clear CF before entering an unrelated cash-flow schedule.','Press 2ND → CE/C.','Undo can recover the previous worksheet in this page session. Some settings are retained by individual worksheets.');
add('KEY.CLR_TVM','Clear TVM values','Sets the five TVM amount/rate/period registers to zero.','Start a fresh loan problem without carrying over an old FV.','Exit any worksheet with 2ND → CPT, then press 2ND → FV.','P/Y, C/Y and payment timing remain as set.');
add('KEY.RESET','Reset calculator values','Returns calculator registers, worksheets, and numerical settings to their defaults.','Use it when you want a fresh calculator setup.','Press ENTER to confirm the pending reset. Press 2ND → CPT to cancel.','Saved history, the clipboard buffer and your theme are separate. Undo can reverse the reset until this page is reloaded.');
add('KEY.INS','Insert a row','Adds a cash-flow group or statistical data row before the selected row.','Insert a missed cash-flow group without re-entering the entire schedule.','Move to a cash-flow or data row, then 2ND → ↓ (INS).','CF0 cannot be inserted. Limits are 24 future flow groups and 50 data rows.');
add('KEY.DEL','Delete a row','Removes the selected future cash-flow group or statistical data pair.','Remove a duplicate observation from your DATA worksheet.','Move to the row, then 2ND → ↑ (DEL).','Undo can recover the deleted row. CF0 is not a deletable group.');
add('KEY.QUIT','Leave a worksheet','Returns to ordinary calculation while retaining stored worksheet values.','Leave CF to compute NPV or begin another task.','Press 2ND → CPT (QUIT).');
add('GENERAL.ready','Find your next step','Define follows the worksheet field or unfamiliar function currently on the display.','Open 2ND → PV, then Define, to learn what P1 means.','Open a worksheet and use ↑ / ↓ to choose a field. Press Define whenever you need its meaning.','You can also search below. Reading help never enters values or changes a setting.');

export function topicId(state,snapshot,lastAction=''){
  if(state.resetPending)return 'KEY.RESET';
  if(state.second)return 'KEY.SECOND';
  if(state.memoryPending)return 'KEY.STO';
  if(state.inverse)return 'KEY.INV';
  if(state.hyperbolic)return 'KEY.HYP';
  if(state.worksheet){
    let field=snapshot.activeVariable;
    if(state.worksheet==='CF' && field!=='CF0')field=/^F/.test(field)?'F':'C';
    if(state.worksheet==='DATA')field=/^X/.test(field)?'X':'Y';
    if(state.worksheet==='MEM')field='M';
    return `${state.worksheet}.${field}`;
  }
  if(state.computePending)return 'KEY.CPT';
  return HELP[`KEY.${lastAction}`]?`KEY.${lastAction}`:'GENERAL.ready';
}
export function resolveHelp(state,snapshot,lastAction=''){
  const id=topicId(state,snapshot,lastAction),topic=HELP[id]||HELP['GENERAL.ready'];
  let tip=topic.tip;
  if(state.worksheet==='DATA' && snapshot.activeVariable?.startsWith('Y'))tip=state.sheets.STAT.model==='1-V'?'Current model: 1-V. This Y field is a positive frequency.':'Current model: '+state.sheets.STAT.model+'. This Y field is a paired measurement.';
  const error=state.error?{message:state.error.message,recovery:(state.error.code===7?'The search did not finish with a usable result. Check signs, rates and the schedule. This can be a solver limit, not proof that no solution exists. ':'Check the field’s allowed values and the message above. ')+'Close Define, then use Undo to return to before the failed action, or CE/C to clear the error.'}:null;
  return {...topic,tip,context:worksheetNames[state.worksheet]||'Calculator',screenLabel:snapshot.label||snapshot.activeVariable||'',screenValue:snapshot.display,error};
}
export function searchHelp(query=''){
  const dynamic=query.trim().toUpperCase().replace(/^[CF]\d{1,2}$/,match=>`CF.${match[0]}`).replace(/^[XY]\d{1,2}$/,match=>`DATA.${match[0]}`).replace(/^M\d$/, 'MEM.M');
  const words=dynamic.toLowerCase().split(/\s+/).filter(Boolean);
  return Object.values(HELP).filter(topic=>topic.group!=='GENERAL' && words.every(word=>`${topic.id} ${helpLabel(topic.id)} ${topic.title} ${topic.meaning} ${worksheetNames[topic.group]||''}`.toLowerCase().includes(word)));
}
export function helpLabel(id){const key=id.split('.').at(-1);return {meanX:'x̄',meanY:'ȳ',sigmaX:'σx',sigmaY:'σy',sumX:'Σx',sumY:'Σy',sumX2:'Σx²',sumY2:'Σy²',sumXY:'Σxy',PY:'P/Y',CY:'C/Y',CHANGE:'%CH',PERIODS:'#PD',FACTORIAL:'x!',EXP:'eˣ',ROUND:'ROUND',POWER:'yˣ',RECIPROCAL:'1/x',SQRT:'√x',SQUARE:'x²'}[key]||key;}
export function relatedHelp(topic){
  if(topic.group==='KEY'){
    const groups=[['SIN','COS','TAN','INV','HYP'],['LN','EXP','POWER','SQRT','SQUARE','RECIPROCAL'],['STO','ANS','ROUND'],['CPT','ENTER','SET','SECOND','QUIT'],['INS','DEL','CLR_WORK','CLR_TVM','RESET'],['FACTORIAL','NPR','NCR']];
    return (groups.find(group=>group.includes(topic.id.slice(4)))||[]).filter(key=>`KEY.${key}`!==topic.id).map(key=>HELP[`KEY.${key}`]);
  }
  return Object.values(HELP).filter(item=>item.group===topic.group && item.id!==topic.id && item.group!=='GENERAL');
}
