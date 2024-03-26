
//@Kveie
//@version=5
strategy(title='3C QFL Mean reversal v3.1', shorttitle='3C QFL v3.1', 
 overlay=true, max_labels_count=500, pyramiding=99, initial_capital=10000, 
  calc_on_order_fills=false, commission_type=strategy.commission.percent, commission_value=0.075)
f_secureSecurity(_symbol, _res, _src) =>
    request.security(_symbol, _res, _src[1], lookahead=barmerge.lookahead_on)

import jason5480/time_filters/1 as tif

//used for labels
i_theme = input.string(defval='dark', title='Chart theme', options=['light', 'dark'])
theme_text_color = i_theme == 'dark' ? color.white : color.black

f_print(_text) =>
    // Create label on the first bar.
    var _label = label.new(x=bar_index, y=na, text=str.tostring(_text), xloc=xloc.bar_index, yloc=yloc.price, color=color.blue, style=label.style_label_up, textcolor=theme_text_color, size=size.normal, textalign=text.align_left)
    // On next bars, update the label's x and y position, and the text it displays.
    if barstate.islastconfirmedhistory
        label.set_xy(_label, bar_index, low * 0.99)
        label.set_text(_label, str.tostring(_text))




// 📆📈 FILTERS =====================================================================================================
// Description: Module responsible for filtering out long and short open signals that do not meet user defined rules
// Dependencies: NONE
// Results: longFiltersApproval, shortFiltersApproval


// INPUT ============================================================================================================
usefromDate = input.bool(defval = true, title = 'From', inline = 'From Date', group = '📆 Filters - Time')
fromDate = input.time(defval = timestamp('01 Jan 2022 00:00 UTC'), title = '', inline = 'From Date', group = '📆 Filters - Time')
usetoDate = input.bool(defval = false, title = 'To ', inline = 'To Date', group = '📆 Filters - Time')
toDate = input.time(defval = timestamp('31 Dec 2121 23:59 UTC'), title = '', inline = 'To Date', group = '📆 Filters - Time')

useSessionDay = input.bool(defval = false, title = 'Session Days', inline = 'Session Days', group = '📆 Filters - Time')
mon = input.bool(defval = true, title = 'Mon', inline = 'Session Days', group = '📆 Filters - Time')
tue = input.bool(defval = true, title = 'Tue', inline = 'Session Days', group = '📆 Filters - Time')
wed = input.bool(defval = true, title = 'Wed', inline = 'Session Days', group = '📆 Filters - Time')
thu = input.bool(defval = true, title = 'Thu', inline = 'Session Days', group = '📆 Filters - Time')
fri = input.bool(defval = true, title = 'Fri', inline = 'Session Days', group = '📆 Filters - Time')
sat = input.bool(defval = true, title = 'Sat', inline = 'Session Days', group = '📆 Filters - Time')
sun = input.bool(defval = true, title = 'Sun', inline = 'Session Days', group = '📆 Filters - Time')
useSessionStart = input.bool(defval = false, title = 'Session Start', inline = 'Session Start', group = '📆 Filters - Time')
sessionStartHour = input.int(defval = 12, title = '', minval = 0, maxval = 23, step = 1, inline = 'Session Start', group = '📆 Filters - Time')
sessionStartMinute = input.int(defval = 00, title = ':', minval = 0, maxval = 59, step = 1, tooltip = 'Start time of the session.', inline = 'Session Start', group = '📆 Filters - Time')
useSessionEnd = input.bool(defval = false, title = 'Session End', inline = 'Session End', group = '📆 Filters - Time')
sessionEndHour = input.int(defval = 20, title = '', minval = 0, maxval = 23, step = 1, inline = 'Session End', group = '📆 Filters - Time')
sessionEndMinute = input.int(defval = 00, title = ':', minval = 0, maxval = 59, step = 1, tooltip = 'End time of the session.', inline = 'Session End', group = '📆 Filters - Time')

bool dateFilterApproval = tif.is_in_date_range(fromDate, toDate, usefromDate, usetoDate)
bool sessionFilterApproval = tif.is_in_session(useSessionStart, sessionStartHour, sessionStartMinute, useSessionEnd, sessionEndHour, sessionEndMinute, useSessionDay, mon, tue, wed, thu, fri, sat, sun)
bool timeFilterApproval = dateFilterApproval and sessionFilterApproval

string _tooltip_bot_control     = 'If this is enabled the strategy can control some bot operations via Webhook calls.\n\nTo enable Webhook calls, check this option, complete Bot id and Email Token. After the strategy is configured, create an alert on the strategy, select Order fills only, and in the message field simply input {{strategy.order.alert_message}}.'
bool i_enable_bot_control     = input.bool(title='Enable Bot Control Via Webhook', defval=false, group='3commas Bot Settings', tooltip=_tooltip_bot_control)
string i_bot_id               = input.string(title='Bot id', defval='', group='3commas Bot Settings')
string i_email_token          = input.string(title='Email token', defval='', group='3commas Bot Settings')
bool i_exec_deal_start        = input.bool(title='Deal start', defval=true, group='3commas Bot Settings')
bool i_exec_safety_order      = input.bool(title='Safety Orders SPOT ONLY', defval=true, group='3commas Bot Settings', 
 tooltip=" SPOT ONLY! The strategy will send a message to add funds in the quote currency (for BTCUSDT quote is USDT). The amount of funds are calculated based on SO settings (size, volume steps). For exact values use the steps table.")
bool i_exec_take_profit       = input.bool(title='Take profit deal stop', defval=true, group='3commas Bot Settings', tooltip = 'The strategy will send a message to take profit')
bool i_exec_stop_loss         = input.bool(title='Stop Loss', defval=true, group='3commas Bot Settings', tooltip = 'The strategy will send a message to execute stop loss')

var g_strategy          = "Strategy"
i_strategy_type         = input.string(title='Strategy Type', defval='long', options=['long', 'short'], group='Strategy settings')
var bool IS_LONG = i_strategy_type == 'long'
tf                      = input.timeframe(title='QFL timeframe', defval='current', group='Strategy settings', tooltip='Do not select a timeframe below the current timeframe (example: if the chart is in 15m do no select 5m in this option, you can select 30m or higher TFs).')
vamp                    = input(title='QFL volume MA', group='Strategy settings', defval=60)
maxbaseage              = input.int(10, 'Max candle age', group='Strategy settings', tooltip='It won\'t open a deal if the price is below a base that has lived for longer than X candles. Use 0 to disable this condition.')
allowConsecutiveSignals = input.bool(false, 'Allow consecutive signals', group='Strategy settings', tooltip='If the conditions are met in to consecutive candles, allow both to trigger the signal and not only the first candle.')
plotLevels              = input(true, 'plot bases', group='Strategy settings')


/////
i_take_profit_type                        = input.string(title='Take Profit Type', defval='% From total volume', options=['% From base order', '% From total volume'], group='Strategy settings')
float i_take_profit_perc                  = input.float(title='Take Profit (%)', minval=0.0, step=0.1, defval=1, group='Strategy settings')
float i_base_order_size_usd               = input.float(title='Base order size', defval=30, step=10, group='Strategy settings')
float i_safety_order_size_usd             = input.float(title='Safety order size', defval=60, step=10, group='Strategy settings')
string _tooltip2                          = "Percentage: Open SO orders every N% of price movement. The price and size are calculated according to settings below (step scale, volume scale)\nExternal indicator: Open SO orders using an external indicator (configure settings below)"
safety_order_condition                    = false
float deal_start_condition                          = input.float(0.5, step=0.1, group= 'Strategy settings', title='QFL percentage to buy', tooltip='When the price falls below the current base this percentage a buy signal will be triggered.')
float i_safety_order_price_deviation_perc = input.float(title='Price Deviation To Open Safety Trades (%)', minval=0.0, step=0.1, defval=0.5, group='Strategy settings')
float i_safety_order_volume_scale         = input.float(title='Safety Order Volume Scale', defval=2, step=0.1, group='Strategy settings')
float i_safety_order_price_step_scale     = input.float(title='Safety Order Step Scale', defval=2, step=0.1, group='Strategy settings')
float i_max_safety_orders                 = input.float(title='Max Safety Trades Count', defval=6, group='Strategy settings')
bool i_enable_stop_loss                   = input.bool(title='Enable Stop Loss', defval=false, group='Strategy settings')
float i_stop_loss_perc                    = input.float(title='Stop Loss (%)', minval=0.0, step=0.1, defval=20, group='Strategy settings')



float i_commision_percent = input.float(title='FEE (%)', minval=0.0, step=0.001, defval=0.075, group='FEE')

//visuals
int i_decimals            = input.int(title='Decimals For Display', defval=2, group='Visuals')

bool i_show_pnl_labels    = input.bool(title='Show PnL Labels', defval=true, group='Visuals')
bool i_show_stats_table   = input.bool(title='Show Table With Statistics', defval=true, group='Visuals')
bool i_show_settings_table= input.bool(title='Show Table With Strategy Settings', defval=false, group='Visuals')
bool i_show_step_table    = input.bool(title='Show Table With Steps Similar To 3commas', defval=false, group='Visuals', tooltip='Make sure the Table with Strategy Settings is disabled because they use the same position\n\nIf the Safety orders type is not percentage all significant values will be replaced by - (dashes)')
float i_steps_bo_price    = input.float(title='BO Entry Price For Steps Table', defval=0, group='Visuals', tooltip="Custom BO price used to calculate all table values. If this is not configured, the close value will be used")

// Base calculations
vam = ta.sma(volume, vamp)
up = high[3]>high[4] and high[4]>high[5] and high[2]<high[3] and high[1]<high[2] and volume[3]>vam[3]
down = low[3]<low[4] and low[4]<low[5] and low[2]>low[3] and low[1]>low[2] and volume[3]>vam[3]

// we need to use functions so we don't upset security. In pine 4 you can only pass unmutable values to security!
fractaldownF() => 
    fd = 0.0
    fd := down ? low[3] : nz(fd[1])
    
fractalupF() => 
    fu = 0.0
    fu := up ? high[3] : nz(fu[1])

fuptf = f_secureSecurity(syminfo.tickerid,tf == "current" ? timeframe.period : tf, fractalupF())
fdowntf = f_secureSecurity(syminfo.tickerid,tf == "current" ? timeframe.period : tf, fractaldownF())

plot(fuptf, "FractalUp", color=color.new(color.lime, plotLevels ? 0 : 100), linewidth=1, style=plot.style_cross, offset =-3, join=false)
plot(fdowntf, "FractalDown", color=color.new(color.red, plotLevels ? 0 : 100), linewidth=1, style=plot.style_cross, offset=-3, join=false)

// bars since 
age = ta.barssince(fuptf != fuptf[1])
agecond = maxbaseage == 0 or age < maxbaseage 

buy = 100*(close/fdowntf) < 100 - deal_start_condition and agecond
sell = 100*(close/fuptf) > 100 + deal_start_condition and agecond


signal =i_strategy_type == 'long' ? buy and (allowConsecutiveSignals or not buy[1] or fdowntf != fdowntf[1]) : i_strategy_type =='short' ? sell and (allowConsecutiveSignals or not sell[1] or fuptf != fuptf[1]) : na


//how many safety orders were executed in current trade
var int count_executed_safety_orders    = 0

var float c_take_profit_price         = na
var float c_stop_loss_price           = na
var float c_base_order_price          = na
var float c_base_order_qty            = na
var float c_next_safety_order_price   = na

// REMOVED
// var float c_next_safety_order_qty     = na

//calculated based on BO size, SO size, and steps
var float c_required_capital          = na

//used for stats and to calculate commision
var float c_total_volume              = 0

//we use these variables to remember position size and use it
//to calculate pnl after the deal was closed
var float c_current_deal_position_size    = na
var float c_current_deal_avg_price        = na

// REMOVED
//var float c_current_deal_prev_position_size   = na

// Used to try to obtain real prices for orders already executed
var float c_strategy_prev_netprofit           = 0

//These remain global because of execution improvement
var float c_current_deal_close_value  = 0
var float c_current_deal_pnl          = 0

//used as a flag for code logic 
var bool c_still_in_deal              = false

var string c_debug_text               = ""
var debug_printed                       = false

//used to avoid placing SO orders over and over again
// needs to be reset once a trade is closed
// false    - SO orders not placed
// true     - SO orders already place
var bool c_so_orders_placed           = false

//array that holds stats for used SO
var int[] statsarray_safety_orders          = array.new_int(0)
var int[] statsarray_safety_orders_timeout  = array.new_int(0)

var int c_dealstart_bar_index = 0
var int[] statsarray_no_of_bars = array.new_int(0)

var int c_dealstart_bar_time          = 0
var float[] statsarray_no_of_days       = array.new_float(0)
var float stats_max_days_in_deal        = 0
var stats_max_days_in_deal_start_time   = 0
var stats_max_days_in_deal_close_time   = 0

var bool firstdeal_started      = false
var int firstdeal_bar_index     = 0
var float firstdeal_start_price = 0
var firstdeal_start_time        = 0

var int lastdeal_close_bar_index    = 0
var lastdeal_close_time             = 0

//buy and hold stats
var float bh_start_price        = 0
var bh_start_time               = 0
var float bh_end_price          = 0
var bh_end_time                 = 0
var bool bh_calculation_started = false

//max drawndown in a deal vs avg position price
var float stats_max_drawdown                = 0
var stats_max_drawdown_time                 = 0
var float stats_max_drawdown_equity_percent = 0

//biggest percent deviation vs base order
var float stats_biggest_dev                 = 0
var stats_biggest_dev_time                  = 0

var float stats_deals_started               = 0
var float stats_deals_finished              = 0
var float stats_deals_stop_loss_finished    = 0
var float stats_deals_take_profit_finished  = 0


//will keep profit / losses
var float[] statsarray_winning_deals_pnl    = array.new_float(0)
var float[] statsarray_losing_deals_pnl     = array.new_float(0)


//FUNCTIONS

//so_index 0 is for BO, from 1..n on it is for SOn
//calculates percent so no adjustment for long vs short
stepped_deviation(so_index) =>
    float _stepped_deviation = 0
    if so_index > 0
        for _i = 1 to so_index by 1
            _stepped_deviation := _stepped_deviation + i_safety_order_price_deviation_perc * math.pow(i_safety_order_price_step_scale, _i - 1)
    else
        _stepped_deviation := 0



// Returns requried price in order to achieve specific percentage
steps_required_price(_bo_price, _avg_price, _pos_size, _take_profit_percent)=>
    float _price = 0
    if i_take_profit_type == '% From total volume'
        if IS_LONG
            _required_price = _avg_price * (1 + _take_profit_percent / 100)
        else
            _required_price = _avg_price * (1 - _take_profit_percent / 100)    
            
    else if i_take_profit_type == "% From base order"
        if IS_LONG
            _req_usdt       = i_base_order_size_usd * i_take_profit_perc / 100
            _required_price = ((_avg_price * _pos_size) + _req_usdt) / _pos_size
        else
            _req_usdt       = i_base_order_size_usd * i_take_profit_perc / 100
            _required_price = ((_avg_price * _pos_size) - _req_usdt) / _pos_size



// Returns the % needed for _last_price to reach _required_price
steps_required_percent(_last_price, _required_price)=>
    if IS_LONG
        _required_percent   = math.round((_required_price * 100 / _last_price) - 100, 2)
    else
        _required_percent   = math.round(100 - (_required_price * 100 / _last_price), 2)



valid_stop_loss() =>
    bool _valid = false
    if i_enable_stop_loss 
        //stop loss percent is bigger than last safety order percent
        if (i_stop_loss_perc > stepped_deviation(i_max_safety_orders))
            _valid := true
    else
        _valid := false      

next_so_price(so_index, _bo_price) =>
    float _stepped_deviation = stepped_deviation(so_index)
    if IS_LONG
        float _next_so_price = _bo_price * (1 - _stepped_deviation / 100)
    else
        float _next_so_price = _bo_price * (1 + _stepped_deviation / 100)


next_so_size_usd(so_index) =>
    float _next_so_size_usd = i_safety_order_size_usd * math.pow(i_safety_order_volume_scale, so_index - 1)


next_so_qty(so_index, _bo_price) =>
    float _next_so_size_usd = next_so_size_usd(so_index)
    float _next_so_qty = _next_so_size_usd / next_so_price(so_index, _bo_price)



get_required_capital() =>
    float _total_buy = 0
    if i_max_safety_orders > 0
        _total_buy := _total_buy + i_base_order_size_usd
        for _i = 1 to i_max_safety_orders by 1
            _total_buy := _total_buy + next_so_size_usd(_i)
    else
        _total_buy := _total_buy + i_base_order_size_usd



get_days(start_time, end_time) =>
    time_diff = end_time - start_time
    diff_days = math.round(time_diff / 86400000, 1)


get_timestring_from_seconds(seconds) =>
    if seconds >= 86400
        string _string = str.tostring(math.round(seconds / 86400, 1)) + ' days'
    else if seconds >= 3600
        string _string = str.tostring(math.round(seconds / 3600, 1)) + ' hours'
    else
        string _string = str.tostring(math.round(seconds / 60, 1)) + ' mins'


get_timestring_from_days(days) =>
    get_timestring_from_seconds(days * 86400)


get_timespan_string(start_time, end_time) =>
    _seconds_diff = (end_time - start_time) / 1000
    get_timestring_from_seconds(_seconds_diff)


//f_print(get_timestring_from_days(0.5) +"\n"+ get_timestring_from_days(0.01) +"\n"+ get_timestring_from_days(0.7))

get_commission_for_volume(vol) =>
    _commision = vol * i_commision_percent / 100


get_final_pnl_new() =>
    float _pnl = 0
    if array.size(statsarray_losing_deals_pnl) > 0
        _pnl := _pnl + array.sum(statsarray_losing_deals_pnl)

    if array.size(statsarray_winning_deals_pnl) > 0
        _pnl := _pnl + array.sum(statsarray_winning_deals_pnl)

    //add or substract current deal openprofit
    //commission is already substracted
    _pnl := _pnl + strategy.openprofit


get_final_pnl_prct_new() =>
    get_final_pnl_new() * 100 / c_required_capital


// take_profit_price(_avg_price = strategy.position_avg_price, _position_size = strategy.position_size)=>
take_profit_price(_avg_price = strategy.position_avg_price, _pos_size = strategy.position_size)=>
    if i_take_profit_type == "% From total volume"
        if IS_LONG
            _tp_price = _avg_price * (1 + i_take_profit_perc/100)
        else
            _tp_price = _avg_price * (1 - i_take_profit_perc/100)
    else if i_take_profit_type == "% From base order"
        if IS_LONG
            _tp_size_usd = i_base_order_size_usd * i_take_profit_perc / 100
            _tp_price =  ((_avg_price * _pos_size) + _tp_size_usd) / _pos_size
        else
            _tp_size_usd = i_base_order_size_usd * i_take_profit_perc / 100
            _tp_price =  ((_avg_price * _pos_size) - _tp_size_usd) / _pos_size



stop_loss_price(_bo_price) =>
    if IS_LONG
        _bo_price * (1 - i_stop_loss_perc / 100)
    else
        _bo_price * (1 + i_stop_loss_perc / 100)


take_profit_price_hit() =>
    if IS_LONG
        high >= c_take_profit_price and strategy.position_size == 0
    else
        low <= c_take_profit_price and strategy.position_size == 0




stop_loss_price_hit() =>
    bool _cond = false

    if valid_stop_loss()
        if IS_LONG
            _cond := low <= c_stop_loss_price and strategy.position_size == 0
        else
            _cond := high >= c_stop_loss_price and strategy.position_size == 0
    else
        _cond := false


get_current_dev_vs_bo_price() =>
    if IS_LONG
        _dev = low * 100 / c_base_order_price - 100
    else
        _dev = 100 - high * 100 / c_base_order_price


get_current_drawdown_equity() =>
    _deal_total_value = strategy.position_size * strategy.position_avg_price
    if IS_LONG
        _drawdown_actual_value = strategy.position_size * low
        _drawdown_equity_percent = _drawdown_actual_value * 100 / _deal_total_value - 100
    else
        _drawdown_actual_value = strategy.position_size * high
        _drawdown_equity_percent = 100 - _drawdown_actual_value * 100 / _deal_total_value


// Tests the size of the position size
is_deal_started() =>
    bool _flag = false
    if IS_LONG and strategy.position_size > 0
        _flag := true
    else if not IS_LONG and strategy.position_size < 0
        _flag := true
    else
        _flag := false


// After a deal is completed we need to reset specific variables
was_deal_marked_as_finished()=>
    // If we are not in a deal anymore but some global variable was not reset yet
    if c_still_in_deal == true
        _state = false
    else
        _state = true


//init array with 0 values
init_stats_array_safety_orders() =>
    for _i = 0 to i_max_safety_orders by 1
        array.push(statsarray_safety_orders, 0)
        array.push(statsarray_safety_orders_timeout, 0)


get_3cbot_startdeal_json() =>
    _string = '{"message_type":"bot", "bot_id":"' + i_bot_id + '", "email_token":"' + i_email_token + '", "delay_seconds":0}'


get_3cbot_stopdeal_json() =>
    _string = '{"action": "close_at_market_price_all", "message_type":"bot", "bot_id":"' + i_bot_id + '", "email_token":"' + i_email_token + '", "delay_seconds":0}'


get_3cbot_addfundsinquote_json(add_volume = 0) =>
    _string = '{"action": "add_funds_in_quote", "message_type":"bot", "bot_id":"' + i_bot_id + '", "email_token":"' + i_email_token + '", "delay_seconds":0, "volume":"' + str.tostring(add_volume) + '"}'


get_month_string(month_number) =>
    if month_number == 1
        _string = 'Jan'
    else if month_number == 2
        _string = 'Feb'
    else if month_number == 3
        _string = 'Mar'
    else if month_number == 4
        _string = 'Apr'
    else if month_number == 5
        _string = 'May'
    else if month_number == 6
        _string = 'Jun'
    else if month_number == 7
        _string = 'Jul'
    else if month_number == 8
        _string = 'Aug'
    else if month_number == 9
        _string = 'Sep'
    else if month_number == 10
        _string = 'Oct'
    else if month_number == 11
        _string = 'Nov'
    else if month_number == 12
        _string = 'Dec'


time_to_date_string(timeinms) =>
    if timeinms > 0
        _string = str.tostring(dayofmonth(timeinms), '00/') + get_month_string(month(timeinms)) + '/' + str.tostring(year(timeinms), '0000') + ' ' + str.tostring(hour(timeinms), '00:') + str.tostring(minute(timeinms), '00:') + str.tostring(second(timeinms), '00')
    else
        _string = ''

get_bg_color_grey(row) =>
    _bgcolor = row % 2 == 0 ? #CACACA : #E5E5E5

get_bg_color_blue(transp=0) =>
    _bgcolor = color.new(#006bb3, transp)

get_bg_color_green(transp=0) =>
    _bgcolor = color.new(#A6E59B, transp)

get_bg_color_red(transp=0) =>
    _bgcolor = color.new(#E59B9B, transp)

get_bg_color_lightblue(transp=0) =>
    _bgcolor = color.new(#00BFFF, transp)

get_bg_color_orange(transp=0) =>
    _bgcolor = color.new(#FFA500, transp)



//stats for buy and hold return
if timeFilterApproval and bh_calculation_started == false
    bh_start_price          := open
    bh_start_time           := time
    bh_calculation_started  := true
    bh_end_price            := close
    bh_end_time             := time_close


//update stats for buy and hold as long as we're still inside date range
if timeFilterApproval
    bh_end_price    := close
    bh_end_time     := time_close


//condition for base order
if timeFilterApproval and signal and not is_deal_started() and was_deal_marked_as_finished()

    //stats for the first deal
    if firstdeal_started == false
        firstdeal_started       := true
        firstdeal_bar_index     := bar_index
        firstdeal_start_price   := close
        firstdeal_start_time    := time
        init_stats_array_safety_orders()

    c_still_in_deal           := true
    stats_deals_started         := stats_deals_started + 1
    c_dealstart_bar_index     := bar_index
    c_dealstart_bar_time      := time

    // Adjust c_strategy_prev_netprofit before starting a new deal if different than the pine script strategy
    // This solves a bug when pine script sells at a sligthly different price than the close price.
    // Case was found when closing deal from external indicator
    if c_strategy_prev_netprofit != strategy.netprofit
        c_strategy_prev_netprofit := strategy.netprofit


    //how many coins
    c_base_order_qty := i_base_order_size_usd / close

    //This value will be overwritten with the actual executed market price on the next candle
    c_base_order_price := close

    // enter with market order because with limit order the open of next candle might be a bit different 
    // than close of current candle and the deal might not start

    _alert_human = 'D' + str.tostring(stats_deals_started) + '-BO (' + str.tostring(syminfo.basecurrency) + '-' + 
     str.tostring(syminfo.currency) + (i_strategy_type == 'long' ? ' LONG' : ' SHORT') + ') | ' + 
      str.tostring(c_base_order_qty * c_base_order_price) + ' ' + str.tostring(syminfo.currency)

    if i_enable_bot_control and i_exec_deal_start
        _alert_json = get_3cbot_startdeal_json()
        strategy.entry(id='D' + str.tostring(stats_deals_started) + '-BO', direction=IS_LONG ? strategy.long : strategy.short, 
         qty=c_base_order_qty, alert_message=_alert_json)
        alert(_alert_human, alert.freq_once_per_bar_close)
    else
        strategy.entry(id='D' + str.tostring(stats_deals_started) + '-BO', direction=IS_LONG ? strategy.long : strategy.short, 
         qty=c_base_order_qty)
        alert(_alert_human, alert.freq_once_per_bar_close)


    

// if we are in a deal
if is_deal_started() and not was_deal_marked_as_finished()
    
    // ------------------------
    // ONLY BO WAS EXECUTED
    // If the only executed order is BO, overwrite SL price and BO price and size based on executed values 
    // taken from stragey.xxx variables
    if strategy.opentrades == 1 and not c_so_orders_placed
        c_so_orders_placed        := true
        c_base_order_price        := strategy.position_avg_price
        c_base_order_qty          := strategy.position_size
        
        count_executed_safety_orders:= 0
        
        c_debug_text += "BO: "+str.tostring(math.round(c_base_order_qty, i_decimals))+" * "+
         str.tostring(math.round(c_base_order_price, i_decimals))+"="+str.tostring(c_base_order_qty * c_base_order_price)+"\n"

        // place all Percentage SO orders as limit orders
        if i_max_safety_orders > 0 
            for _so_number = 1 to i_max_safety_orders
                _next_so_price      = next_so_price(_so_number, c_base_order_price)
                _next_so_qty        = next_so_qty(_so_number, c_base_order_price)
                _next_so_size_usd   = next_so_size_usd(_so_number)
                

        
                c_debug_text += "SO"+str.tostring(_so_number)+": "+str.tostring(math.round(_next_so_qty, i_decimals))+"*"+
                 str.tostring(math.round(_next_so_price, i_decimals))+"="+str.tostring(_next_so_qty * _next_so_price)+"\n"
    
                if i_enable_bot_control and i_exec_safety_order
                    _alert_json = get_3cbot_addfundsinquote_json(_next_so_size_usd)
                    strategy.entry(id='D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(_so_number), 
                     direction=IS_LONG ? strategy.long : strategy.short, qty=_next_so_qty, limit=_next_so_price, alert_message=_alert_json)
                else
                    strategy.entry(id='D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(_so_number), 
                     direction=IS_LONG ? strategy.long : strategy.short, qty=_next_so_qty, limit=_next_so_price)

            //used for plot
            c_next_safety_order_price := next_so_price(1, c_base_order_price)
            
        // create SL order as limit
        if valid_stop_loss()
            c_stop_loss_price := stop_loss_price(c_base_order_price)
            
            c_debug_text += "SL: "+str.tostring(c_stop_loss_price)+"\n"
            
            if i_enable_bot_control and i_exec_stop_loss
                _alert_json = get_3cbot_stopdeal_json()
                strategy.exit(id='D' + str.tostring(stats_deals_started) + '-SL', stop=c_stop_loss_price, 
                 when=is_deal_started(), alert_message=_alert_json)
            else

        
                strategy.exit(id='D' + str.tostring(stats_deals_started) + '-SL', stop=c_stop_loss_price, when=is_deal_started())

    
    // ------------------------
    // AT LEAST ONE SAFETY ORDER (PERCENTAGE) WAS EXECUTED IN THE MEANTIME
    // Update statistics and send alerts
    if strategy.opentrades > (count_executed_safety_orders + 1)

        for _i = count_executed_safety_orders+1 to strategy.opentrades
            _next_so_price  = next_so_price(_i, c_base_order_price)
            _next_so_qty    = next_so_qty(_i, c_base_order_price)
            //delayed alert about previous SO execution
            _alert_human = 'D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(_i) + ' [delayed] (' +
             str.tostring(syminfo.basecurrency) + '_' + str.tostring(syminfo.currency) + 
              (i_strategy_type == 'long' ? ' LONG' : ' SHORT') + ') | ' + 
               str.tostring(_next_so_price * _next_so_qty) + ' ' + str.tostring(syminfo.currency)
            alert(_alert_human, alert.freq_once_per_bar_close)
    
        //update to current open trades
        count_executed_safety_orders    := (strategy.opentrades - 1)
        
        //for visual plot
        if count_executed_safety_orders < i_max_safety_orders
            c_next_safety_order_price := next_so_price(count_executed_safety_orders+1, c_base_order_price)
        else if count_executed_safety_orders == i_max_safety_orders
            c_next_safety_order_price := na


    // ------------------------
    // SAFETY ORDER FROM EXTERNAL INDICATOR
    // Place safety order as market order at current close
    if safety_order_condition == true and count_executed_safety_orders < i_max_safety_orders
        count_executed_safety_orders    := count_executed_safety_orders + 1
        _next_so_size_usd                = next_so_size_usd(count_executed_safety_orders)
        _next_so_qty                     = _next_so_size_usd / close
        
        if i_enable_bot_control and i_exec_safety_order
            _alert_json = get_3cbot_addfundsinquote_json(_next_so_size_usd)
            strategy.entry(id='D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(count_executed_safety_orders), 
             direction=IS_LONG ? strategy.long : strategy.short, qty=_next_so_qty, alert_message=_alert_json)
        else
            strategy.entry(id='D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(count_executed_safety_orders), 
             direction=IS_LONG ? strategy.long : strategy.short, qty=_next_so_qty)

        _alert_human = 'D' + str.tostring(stats_deals_started) + '-SO' + str.tostring(count_executed_safety_orders) + ' (' +
         str.tostring(syminfo.basecurrency) + '_' + str.tostring(syminfo.currency) + 
          (i_strategy_type == 'long' ? ' LONG' : ' SHORT') + ') | ' + 
           str.tostring(_next_so_size_usd) + ' ' + str.tostring(syminfo.currency)
        alert(_alert_human, alert.freq_once_per_bar_close)
    

    
    // ------------------------
    // GENERAL UPDATES FOR EACH CANDLE
    // TAKE PROFIT
    // Recalculate TP price based on current strategy.position_avg_price 
    // and strategy.position_size and UPDATE ORDER
    
    if i_take_profit_type  == '% From total volume'
        c_take_profit_price := take_profit_price()
        
        //Place or update TP order
        if i_enable_bot_control and i_exec_take_profit
            _alert_json = get_3cbot_stopdeal_json()
            strategy.order(id='D' + str.tostring(stats_deals_started) + '-TP', limit=c_take_profit_price, 
             direction=IS_LONG ? strategy.short : strategy.long, qty=math.abs(strategy.position_size), 
              when=is_deal_started(), alert_message=_alert_json)
        else
            strategy.order(id='D' + str.tostring(stats_deals_started) + '-TP', limit=c_take_profit_price, 
             direction=IS_LONG ? strategy.short : strategy.long, qty=math.abs(strategy.position_size), 
              when=is_deal_started())
        
        //hack because if clause has return type
        string _dumb_string = ""
        
    else
        c_take_profit_price := na
        
        //hack because if clause has return type
        string _dumb_string = ""
        
        
  


    
    // ------------------------
    // GENERAL STATISTICS

    //save these variables for pushing stats after the deal is finished
    c_current_deal_position_size  := strategy.position_size
    c_current_deal_avg_price      := strategy.position_avg_price

    //stats for max drawndown
    if strategy.openprofit < stats_max_drawdown
        stats_max_drawdown                  := strategy.openprofit
        stats_max_drawdown_equity_percent   := get_current_drawdown_equity()
        //approx
        stats_max_drawdown_time             := time


    // Biggest drop vs base order price
    _current_dev_vs_bo_price = get_current_dev_vs_bo_price()
    if _current_dev_vs_bo_price < stats_biggest_dev
        stats_biggest_dev       := _current_dev_vs_bo_price
        //approx
        stats_biggest_dev_time  := time



// ----------------------------------
// IS DEAL FINISHED ON THIS CANDLE?

condition_take_profit               = false
condition_stop_external_indicator   = false
condition_stop_loss                 = false


if stop_loss_price_hit() and not is_deal_started() and not was_deal_marked_as_finished()
    condition_stop_loss     := true
else if i_take_profit_type == '% From total volume' and take_profit_price_hit() and not is_deal_started() and not was_deal_marked_as_finished()
    condition_take_profit   := true

    
condition_to_cancel_open_orders     = condition_take_profit or condition_stop_loss 

//reset variables for next trade and push stats
if condition_to_cancel_open_orders

    strategy.cancel_all(when=condition_to_cancel_open_orders)
    
    //common stats for all cases
    stats_deals_finished    := stats_deals_finished + 1

    //add to Total Volume the curernt deal VOLUME up to this point (without exit order)
    c_total_volume        := c_total_volume + (c_current_deal_position_size * c_current_deal_avg_price)

    _current_days_in_deal = get_days(c_dealstart_bar_time, time)
    array.push(statsarray_no_of_bars, bar_index - c_dealstart_bar_index)
    array.push(statsarray_no_of_days, _current_days_in_deal)

    if stats_max_days_in_deal <= _current_days_in_deal
        stats_max_days_in_deal := _current_days_in_deal
        //approx
        stats_max_days_in_deal_start_time := c_dealstart_bar_time
        stats_max_days_in_deal_close_time := time

    
    //statistics that are specific to each close type
    if condition_stop_loss
        stats_deals_stop_loss_finished  := stats_deals_stop_loss_finished + 1

        // Extracting PNL. This is different calculation for each deal close type
        c_current_deal_pnl        := strategy.netprofit - c_strategy_prev_netprofit
        c_strategy_prev_netprofit := strategy.netprofit

        c_current_deal_close_value    := c_current_deal_position_size * c_stop_loss_price
        c_total_volume                := c_total_volume + c_current_deal_close_value

        array.push(statsarray_losing_deals_pnl, c_current_deal_pnl)

        if i_show_pnl_labels
            label.new(bar_index, c_stop_loss_price, text=str.tostring(math.round(c_current_deal_pnl, i_decimals)) + 
             '  ' + str.tostring(syminfo.currency) + '\n' + get_timespan_string(c_dealstart_bar_time, time), 
              yloc=yloc.price, size=size.normal, style=label.style_label_down, textcolor=color.black, color=get_bg_color_red())

        //delayed alert about deal close by stop loss
        _alert_human = 'D' + str.tostring(stats_deals_started) + '-SL [delayed] (' + str.tostring(syminfo.basecurrency) + 
         '_' + str.tostring(syminfo.currency) + (i_strategy_type == 'long' ? ' LONG' : ' SHORT') + ') | ' + 
          str.tostring(math.round(c_current_deal_pnl, i_decimals)) + ' ' + str.tostring(syminfo.currency) + 
           ' | ' + get_timespan_string(c_dealstart_bar_time, time)
        alert(_alert_human, alert.freq_once_per_bar_close)




        // Extracting PNL. This is different calculation for each deal close type
        c_current_deal_pnl        := strategy.netprofit - c_strategy_prev_netprofit
        c_strategy_prev_netprofit := strategy.netprofit

        //executes on open price
        c_current_deal_close_value    := c_current_deal_position_size * open
        c_total_volume                := c_total_volume + c_current_deal_close_value



        if c_current_deal_pnl >= 0
            array.push(statsarray_winning_deals_pnl, c_current_deal_pnl)
        else
            array.push(statsarray_losing_deals_pnl, c_current_deal_pnl)

        //increase SO array as well but also a separate that holds timeout deals count
        array.set(statsarray_safety_orders, count_executed_safety_orders, array.get(statsarray_safety_orders, count_executed_safety_orders) + 1)
        array.set(statsarray_safety_orders_timeout, count_executed_safety_orders, array.get(statsarray_safety_orders_timeout, count_executed_safety_orders) + 1)



    //we consider that deal closed with any SO, if not closed with SL
    else if condition_take_profit
        array.set(statsarray_safety_orders, count_executed_safety_orders, array.get(statsarray_safety_orders, count_executed_safety_orders) + 1)
        stats_deals_take_profit_finished    := stats_deals_take_profit_finished + 1

        // Extracting PNL. This is different calculation for each deal close type
        c_current_deal_pnl        := strategy.netprofit - c_strategy_prev_netprofit
        c_strategy_prev_netprofit := strategy.netprofit

        c_current_deal_close_value    := c_current_deal_position_size * c_take_profit_price
        c_total_volume                := c_total_volume + c_current_deal_close_value

        array.push(statsarray_winning_deals_pnl, c_current_deal_pnl)

        if i_show_pnl_labels
            label.new(bar_index, c_take_profit_price, text='' + str.tostring(math.round(c_current_deal_pnl, i_decimals)) + 
             '  ' + str.tostring(syminfo.currency) + '\n' + get_timespan_string(c_dealstart_bar_time, time), 
              yloc=yloc.price, size=size.normal, style=label.style_label_up, textcolor=color.black, color=get_bg_color_green())

        //delayed alert about deal close by take profit
        _alert_human = 'D' + str.tostring(stats_deals_started) + '-TP [delayed] (' + str.tostring(syminfo.basecurrency) + '_' + 
         str.tostring(syminfo.currency) + (i_strategy_type == 'long' ? ' LONG' : ' SHORT') + ') | ' + 
          str.tostring(math.round(c_current_deal_pnl, i_decimals)) + ' ' + str.tostring(syminfo.currency) + 
           ' | ' + get_timespan_string(c_dealstart_bar_time, time)
        alert(_alert_human, alert.freq_once_per_bar_close)



    else if condition_stop_external_indicator
        
        // This order has to be placed after strategy.cancel_all(), otherwise it will get canceled as well
        // It will get executed on the next bar open using market order
        // Cancel TP order if any
        if i_enable_bot_control
            _alert_json = get_3cbot_stopdeal_json()
            strategy.order(id='D' + str.tostring(stats_deals_started) + '-EXT-IND', direction=IS_LONG ? strategy.short : strategy.long, 
             qty=math.abs(strategy.position_size), alert_message=_alert_json)
        else

            strategy.order(id='D' + str.tostring(stats_deals_started) + '-EXT-IND', direction=IS_LONG ? strategy.short : strategy.long, 
             qty=math.abs(strategy.position_size)) 

        
        
         
        array.set(statsarray_safety_orders, count_executed_safety_orders, array.get(statsarray_safety_orders, count_executed_safety_orders) + 1)
        stats_deals_take_profit_finished    := stats_deals_take_profit_finished + 1

        c_current_deal_close_value    := c_current_deal_position_size * close
        c_total_volume                := c_total_volume + c_current_deal_close_value
        
        // Extracting PNL before the deal is actually closed. Deal will get closed on 
        // the open of next candle
        // This is different calculation for each deal close type
        c_current_deal_pnl            := strategy.openprofit - get_commission_for_volume(c_current_deal_close_value)
        
        c_strategy_prev_netprofit     := strategy.netprofit + c_current_deal_pnl

        
        if c_current_deal_pnl >= 0
            array.push(statsarray_winning_deals_pnl, c_current_deal_pnl)
        else
            array.push(statsarray_losing_deals_pnl, c_current_deal_pnl)
        
        if i_show_pnl_labels

              
            label.new(bar_index, close, text='' + str.tostring(math.round(c_current_deal_pnl, i_decimals)) + 
             '  ' + str.tostring(syminfo.currency) + '\n' + get_timespan_string(c_dealstart_bar_time, time), 
              yloc=yloc.price, size=size.normal, style=label.style_label_up, textcolor=color.black, color=get_bg_color_orange())
        



    //RESET GLOBALS AFTER DEAL COMPLETION
    c_still_in_deal                   := false
    
    lastdeal_close_bar_index            := bar_index
    //approximate
    lastdeal_close_time                 := time

    c_take_profit_price               := na
    c_stop_loss_price                 := na
    c_base_order_price                := na
    c_base_order_qty                  := na
    c_next_safety_order_price         := na
    
    c_so_orders_placed                := false
    
    // REMOVE?
    //c_next_safety_order_qty           := na
    
    c_current_deal_position_size      := na
    
    // REMOVE?
    //c_current_deal_prev_position_size := na
    c_current_deal_avg_price          := na
    c_current_deal_close_value        := na
    c_current_deal_pnl                := 0

    c_debug_text                      := ""
    debug_printed                       := false

    c_dealstart_bar_index             := na
    c_dealstart_bar_time              := na

    // REMOVE?
    //count_placed_safety_orders          := 0
    count_executed_safety_orders        := 0


// ----------------------
// PLOT STUFF
_color_avg_price = theme_text_color
_color_take_profit = get_bg_color_green(90)
 


p1 = plot(c_take_profit_price, color=get_bg_color_green(), style=plot.style_circles, title='Take Profit')
p2 = plot(strategy.position_avg_price, color=theme_text_color, style=plot.style_circles, title='Deal avg price')
p3 = plot(c_next_safety_order_price, color=get_bg_color_red(), style=plot.style_circles, title='Safety order')
p4 = plot(c_stop_loss_price, color=get_bg_color_orange(), style=plot.style_circles, title='Stop loss')


fill(p1, p2, color=_color_take_profit, title='Fill take profit')
fill(p2, p3, color=get_bg_color_red(90), title='Fill safety order')


// Normally fill stop loss from last so price
fill(p3, p4, color=get_bg_color_orange(90), title='Fill stop loss')

// If SO are not configured or all SO were executed fill SL from AVG PRICE
_col = (i_max_safety_orders == 0 or na(c_next_safety_order_price)) ? get_bg_color_red(90) : get_bg_color_red(100)
fill(p2, p4, color=_col, title='Fill stop loss') 


// ---------------------
// LAST CANDLE - DRAW ALL TABLES
if barstate.islastconfirmedhistory
    c_required_capital := get_required_capital()

    //if we are still in a deal, update some stats to current bar
    _deal_in_progress = stats_deals_finished < stats_deals_started
    if _deal_in_progress
        lastdeal_close_bar_index := bar_index
        //approximate
        lastdeal_close_time := time
        array.push(statsarray_no_of_bars, bar_index - c_dealstart_bar_index)
        array.push(statsarray_no_of_days, get_days(c_dealstart_bar_time, time_close))
        if stats_max_days_in_deal <= get_days(c_dealstart_bar_time, time_close)
            stats_max_days_in_deal := get_days(c_dealstart_bar_time, time_close)
            stats_max_days_in_deal_start_time := c_dealstart_bar_time
            stats_max_days_in_deal_close_time := time_close


    //----------------------------------------------------------------
    //data validation and a table with warnings
    string _text_warnings = ''

    if stats_deals_started == 0
        _text_warnings := _text_warnings + ' - No deal started\n'

    if stats_deals_finished == 0
        _text_warnings := _text_warnings + ' - No deal finished\n'

    if i_enable_stop_loss and valid_stop_loss() == false
        _text_warnings := _text_warnings + ' - Stop loss is less than last safety order (should be more than ' + str.tostring(math.round(stepped_deviation(i_max_safety_orders), 2)) + '%' + ')\n'

    if stepped_deviation(i_max_safety_orders) > 100
        _text_warnings := _text_warnings + ' - Covered deviation via safety orders is over 100%\n'

    if _text_warnings != ''
        table warnings = table.new(position.bottom_center, columns=1, rows=2, frame_width=1, frame_color=color.red, border_width=1, border_color=color.red, bgcolor=color.red)
        table.cell(warnings, 0, 0, 'WARNINGS!\n(Fix them, otherwise the stats are innacurate)', text_color=color.white, text_halign=text.align_center)
        table.cell(warnings, 0, 1, _text_warnings, text_color=color.white, text_halign=text.align_left)
    //----------------------------------------------------------------



    //----------------------------------------------------------------
    //a table with buying steps, volumes, prices similar to 3commas
    //set custom values for bo entry price

    if i_show_step_table
        if i_steps_bo_price == 0 or na(i_steps_bo_price)
            i_steps_bo_price := close
            
        _steps_bo_size = i_base_order_size_usd / i_steps_bo_price

        table steps_amount = table.new(position.bottom_left, columns=12, rows=int(i_max_safety_orders) + 4, frame_width=1, frame_color=color.black, border_width=1, border_color=color.black, bgcolor=color.blue)
        table.cell(steps_amount, 0, 0, 'Order\nno', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 1, 0, 'Deviation\n( % )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 2, 0, 'Size\n( ' + str.tostring(syminfo.basecurrency) + ' )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 3, 0, 'Volume\n( ' + str.tostring(syminfo.currency) + ' )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 4, 0, 'Price\n( ' + str.tostring(syminfo.currency) + ' )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 5, 0, 'Avg price\n( ' + str.tostring(syminfo.currency) + ' )', text_color=color.white, text_size=size.small)
        
        table.cell(steps_amount, 6, 0, 'Price for TP\n( ' + str.tostring(syminfo.currency) + ' )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 7, 0, '% change\nfor TP', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 8, 0, '% change\nfor BEP', text_color=color.white, text_size=size.small)
        
        table.cell(steps_amount, 9, 0, 'Total size\n( ' + str.tostring(syminfo.basecurrency) + ' )', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 10, 0, 'Total Vol\n( ' + str.tostring(syminfo.currency) + ' )', text_color=color.white, text_size=size.small)

        float _steps_total_size = _steps_bo_size
        float _steps_total_volume = i_steps_bo_price * _steps_bo_size

        //base order
        table.cell(steps_amount, 0, 1, 'BO', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 1, 1, '0', text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 2, 1, str.tostring(math.round(_steps_bo_size, i_decimals)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 3, 1, str.tostring(math.round(i_steps_bo_price * _steps_bo_size, i_decimals)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 4, 1, str.tostring(math.round(i_steps_bo_price, i_decimals)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 5, 1, str.tostring(math.round(_steps_total_volume / _steps_total_size, i_decimals)), text_color=color.white, text_size=size.small)
        
        _req_price_for_tp = steps_required_price(i_steps_bo_price,  _steps_total_volume / _steps_total_size, _steps_total_size, i_take_profit_perc)
        table.cell(steps_amount, 6, 1, str.tostring(math.round(_req_price_for_tp, i_decimals)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 7, 1, str.tostring(steps_required_percent(i_steps_bo_price, _req_price_for_tp)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 8, 1, str.tostring(steps_required_percent(i_steps_bo_price, i_steps_bo_price)), text_color=color.white, text_size=size.small)

        table.cell(steps_amount, 9, 1, str.tostring(math.round(_steps_total_size, i_decimals)), text_color=color.white, text_size=size.small)
        table.cell(steps_amount, 10, 1, str.tostring(_steps_total_volume), text_color=color.white, text_size=size.small)

        float _steps_next_safety_order_price = 0 
        float _steps_next_safety_order_qty = 0

        if i_max_safety_orders > 0 
            for _i = 1 to i_max_safety_orders by 1
                _steps_next_safety_order_price  := next_so_price(_i, i_steps_bo_price)
                _steps_next_safety_order_qty    := next_so_qty(_i, i_steps_bo_price)

                _steps_total_size   += _steps_next_safety_order_qty
                _steps_total_volume += _steps_next_safety_order_qty * _steps_next_safety_order_price

                table.cell(steps_amount, 0, _i + 2, str.tostring(_i), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 1, _i + 2, str.tostring(stepped_deviation(_i)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 2, _i + 2, str.tostring(math.round(_steps_next_safety_order_qty, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 3, _i + 2, str.tostring(math.round(_steps_next_safety_order_qty * _steps_next_safety_order_price, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 4, _i + 2, str.tostring(math.round(_steps_next_safety_order_price, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 5, _i + 2, str.tostring(math.round(_steps_total_volume / _steps_total_size, i_decimals)), text_color=color.white, text_size=size.small)
                
                _req_price_for_tp := steps_required_price(i_steps_bo_price,  _steps_total_volume / _steps_total_size, _steps_total_size, i_take_profit_perc)
                table.cell(steps_amount, 6, _i + 2, str.tostring(math.round(_req_price_for_tp, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 7, _i + 2, str.tostring(steps_required_percent(_steps_next_safety_order_price, _req_price_for_tp)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 8, _i + 2, str.tostring(steps_required_percent(_steps_next_safety_order_price, _steps_total_volume / _steps_total_size)), text_color=color.white, text_size=size.small)
                
                table.cell(steps_amount, 9, _i + 2, str.tostring(math.round(_steps_total_size, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 10, _i + 2, str.tostring(_steps_total_volume), text_color=color.white, text_size=size.small)
        else if i_max_safety_orders > 0
            float _steps_next_safety_order_qty_usd = 0
            for _i = 1 to i_max_safety_orders by 1
                _steps_next_safety_order_qty_usd := next_so_size_usd(_i)
                _steps_total_volume += _steps_next_safety_order_qty_usd

                table.cell(steps_amount, 0, _i + 2, str.tostring(_i), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 1, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 2, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 3, _i + 2, str.tostring(math.round(_steps_next_safety_order_qty_usd, i_decimals)), text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 4, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 5, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 6, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 7, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 8, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 9, _i + 2, "-", text_color=color.white, text_size=size.small)
                table.cell(steps_amount, 10, _i + 2, str.tostring(_steps_total_volume), text_color=color.white, text_size=size.small)
    //----------------------------------------------------------------




    //----------------------------------------------------------------
    //a table with all kind of statistics about strategy results
    if i_show_stats_table
        int rowsforstats = array.size(statsarray_safety_orders) + 25
        table sostats = table.new(position.top_right, columns=2, rows=rowsforstats, frame_width=1, frame_color=color.black)

        _row = 0
        table.cell(sostats, column=0, row=_row, text='QFL Backtester ' + str.tostring(syminfo.basecurrency) + ' / ' + str.tostring(syminfo.currency), text_halign=text.align_left, text_size=size.small, text_color=color.white, bgcolor=get_bg_color_orange())
        table.cell(sostats, column=1, row=_row, text='', text_size=size.small, text_color=color.white, bgcolor=get_bg_color_orange())
        _row := _row + 1

        table.cell(sostats, column=0, row=_row, text='Status:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        if _deal_in_progress
            table.cell(sostats, column=1, row=_row, text='Deal in progress', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_red())
        else if stats_deals_started == 0 and stats_deals_finished == 0
            table.cell(sostats, column=1, row=_row, text='No deals', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_red())
        else
            table.cell(sostats, column=1, row=_row, text='All deals closed', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_green())
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Open deals:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        if stats_deals_started - stats_deals_finished == 0
            table.cell(sostats, column=1, row=_row, text='0', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_green())
        else
            _current_deal_total_value = strategy.position_size * strategy.position_avg_price
            _current_deal_actual_value = strategy.position_size * close
            float _current_deal_equity_percent = 0
            if IS_LONG
                _current_deal_equity_percent := _current_deal_actual_value * 100 / _current_deal_total_value - 100
                _current_deal_equity_percent
            else
                _current_deal_equity_percent := 100 - _current_deal_actual_value * 100 / _current_deal_total_value

            _text0 = str.tostring(stats_deals_started - stats_deals_finished) + ' deal\n'
            _text0 := _text0 + str.tostring(math.round(strategy.openprofit, i_decimals)) + ' ' + str.tostring(syminfo.currency)
            _text0 := _text0 + ' (' + str.tostring(math.round(_current_deal_equity_percent, 2)) + '%)\n'
            _text0 := _text0 + str.tostring(get_timespan_string(c_dealstart_bar_time, time_close)) + ', currently at SO ' + str.tostring(count_executed_safety_orders+1) + '\n'
            _text0 := _text0 + '(start: ' + str.tostring(time_to_date_string(c_dealstart_bar_time)) + ')'
            table.cell(sostats, column=1, row=_row, text=_text0, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_red())
        _row := _row + 1

        table.cell(sostats, column=0, row=_row, text='Finished deals:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(stats_deals_finished), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Winning deals:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        if stats_deals_take_profit_finished == 0
            table.cell(sostats, column=1, row=_row, text=str.tostring(array.size(statsarray_winning_deals_pnl)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        else
            _text5 = ''
            _text5 := _text5 + str.tostring(stats_deals_take_profit_finished)
            _text5 := _text5 + ' (' + str.tostring(math.round(array.avg(statsarray_winning_deals_pnl), i_decimals))
            _text5 := _text5 + ' ' + str.tostring(syminfo.currency) + ' on avg)'

            table.cell(sostats, column=1, row=_row, text=_text5, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_green())
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Losing deals:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        if array.size(statsarray_losing_deals_pnl) == 0
            table.cell(sostats, column=1, row=_row, text=str.tostring(array.size(statsarray_losing_deals_pnl)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_green())
        else
            _text6 = ''
            _text6 := _text6 + str.tostring(array.size(statsarray_losing_deals_pnl))
            _text6 := _text6 + ' (' + str.tostring(math.round(array.avg(statsarray_losing_deals_pnl), i_decimals))
            _text6 := _text6 + ' ' + str.tostring(syminfo.currency) + ' on avg)'

            table.cell(sostats, column=1, row=_row, text=_text6, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_red())
        _row := _row + 1




        table.cell(sostats, column=0, row=_row, text='Total time  ( Max  |  Avg time in deal ):', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _text4 = '' + str.tostring(get_timespan_string(bh_start_time, bh_end_time)) + '    ( '
        _text4 := _text4 + '' + get_timestring_from_days(array.max(statsarray_no_of_days)) + '  |  '
        _text4 := _text4 + '' + get_timestring_from_days(array.avg(statsarray_no_of_days)) + ' )'
        table.cell(sostats, column=1, row=_row, text=_text4, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Total backtest:\n' + str.tostring(time_to_date_string(bh_start_time)) + '\n' + str.tostring(time_to_date_string(bh_end_time)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text='Max days in deal:\n' + str.tostring(time_to_date_string(stats_max_days_in_deal_start_time)) + '\n' + str.tostring(time_to_date_string(stats_max_days_in_deal_close_time)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Required capital:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(c_required_capital) + ' ' + str.tostring(syminfo.currency), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1

        table.cell(sostats, column=0, row=_row, text='Profit:\n(after commision)', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))

        _text1 = str.tostring(math.round(get_final_pnl_new(), i_decimals)) + ' ' + str.tostring(syminfo.currency)
        _text1 := _text1 + ' (' + str.tostring(math.round(get_final_pnl_prct_new(), 2)) + ' %)\n'
        if get_days(bh_start_time, bh_end_time) >= 1
            _text1 := _text1 + str.tostring(math.round(get_final_pnl_prct_new() / get_days(bh_start_time, bh_end_time), 2)) + '% / day'
        else
            _text1 := _text1 + str.tostring(math.round(get_final_pnl_prct_new(), 2)) + '% / day'
        table.cell(sostats, column=1, row=_row, text=_text1, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        //if date range is limited calculate between start and end date
        _bh_equity = c_required_capital / bh_start_price * bh_end_price - c_required_capital
        _bh_commision = get_commission_for_volume(c_required_capital + c_required_capital / bh_start_price * bh_end_price)
        _bh_equity := _bh_equity - _bh_commision
        _bh_prct_total = math.round(_bh_equity * 100 / c_required_capital, 2)

        table.cell(sostats, column=0, row=_row, text='Buy & hold return:\n(after commision)', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _text2 = str.tostring(math.round(_bh_equity, i_decimals)) + ' ' + str.tostring(syminfo.currency)
        _text2 := _text2 + ' (' + str.tostring(_bh_prct_total) + '%)\n'
        if get_days(bh_start_time, bh_end_time) >= 1
            _text2 := _text2 + str.tostring(math.round(_bh_prct_total / get_days(bh_start_time, bh_end_time), 2)) + '% / day'
        else
            _text2 := _text2 + str.tostring(math.round(_bh_prct_total, 2)) + '% / day'
            _text2
        table.cell(sostats, column=1, row=_row, text=_text2, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Covered deviation:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(stepped_deviation(i_max_safety_orders), 2)) + '%', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        string _bef = valid_stop_loss() ? 'before SL' : ''
        table.cell(sostats, column=0, row=_row, text='Max deviation:\n(Deal start price vs worst candle ' + _bef + ')', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(stats_biggest_dev, 2)) + '%\n' + '(' + time_to_date_string(stats_biggest_dev_time) + ')', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Max drawdown from breakeven:\n(Avg price vs worst candle ' + _bef + ')', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(stats_max_drawdown, i_decimals)) + ' ' + str.tostring(syminfo.currency) + ' (' + str.tostring(math.round(stats_max_drawdown_equity_percent, 2)) + '%)\n' + '(' + time_to_date_string(stats_max_drawdown_time) + ')', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1



        table.cell(sostats, column=0, row=_row, text='Max # bars in deal:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(array.max(statsarray_no_of_bars)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Avg # bars in deal:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(array.avg(statsarray_no_of_bars), 2)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        table.cell(sostats, column=0, row=_row, text='Total volume:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(c_total_volume, i_decimals)) + ' ' + str.tostring(syminfo.currency), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1

        table.cell(sostats, column=0, row=_row, text='Commision:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        table.cell(sostats, column=1, row=_row, text=str.tostring(math.round(get_commission_for_volume(c_total_volume), i_decimals)) + ' ' + str.tostring(syminfo.currency), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
        _row := _row + 1


        if array.size(statsarray_safety_orders) > 0
            table.cell(sostats, column=0, row=_row, text='Close stats for ' + str.tostring(stats_deals_finished) + ' deals', text_color=color.white, text_size=size.small, bgcolor=get_bg_color_orange(), text_halign=text.align_left)
            table.cell(sostats, column=1, row=_row, text='Number (%) / Exit with timeout', text_color=color.white, text_size=size.small, bgcolor=get_bg_color_orange())
            _row := _row + 1
            _saved_row = _row
            _row := _row + 2

            _max_safety_orders = 0
            float _avg_safety_orders = 0
            for _i = 0 to array.size(statsarray_safety_orders) - 1 by 1
                string _closed_text = ''
                if _i == 0
                    _closed_text := 'BO    (' + str.tostring(math.round(stepped_deviation(_i), 2)) + '%)'
                else
                    _closed_text := 'SO ' + str.tostring(_i) + ' (' + str.tostring(math.round(stepped_deviation(_i), 2)) + '%)'

                _cnt = array.get(statsarray_safety_orders, _i)
                if _cnt > 0 and _i > _max_safety_orders
                    _max_safety_orders := _i

                _avg_safety_orders := _avg_safety_orders + _cnt * _i
                table.cell(sostats, column=0, row=_row + _i, text='Closed with ' + _closed_text, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row + _i))
                table.cell(sostats, column=1, row=_row + _i, text=str.tostring(_cnt) + ' (' + str.tostring(math.round(_cnt * 100 / stats_deals_finished, 2)) + '%) / ' + str.tostring(array.get(statsarray_safety_orders_timeout, _i)), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row + _i))

            _avg_safety_orders := math.round(_avg_safety_orders / array.sum(statsarray_safety_orders), 1)

            table.cell(sostats, column=0, row=_saved_row, text='Max SO used:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_saved_row))
            table.cell(sostats, column=1, row=_saved_row, text=str.tostring(_max_safety_orders), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_saved_row))

            table.cell(sostats, column=0, row=_saved_row + 1, text='Avg SO used:', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_saved_row + 1))
            table.cell(sostats, column=1, row=_saved_row + 1, text=str.tostring(_avg_safety_orders), text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_saved_row + 1))

        if valid_stop_loss()
            _row := _row + array.size(statsarray_safety_orders)
            table.cell(sostats, column=0, row=_row, text='Closed with Stop Loss (' + str.tostring(i_stop_loss_perc) + '%)', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))
            table.cell(sostats, column=1, row=_row, text=str.tostring(stats_deals_stop_loss_finished) + ' (' + str.tostring(math.round(stats_deals_stop_loss_finished * 100 / stats_deals_finished, 2)) + '%)', text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=stats_deals_stop_loss_finished > 0 ? get_bg_color_red() : get_bg_color_green())
    //----------------------------------------------------------------



    //----------------------------------------------------------------
    if i_show_settings_table
        table settings = table.new(position.bottom_left, columns=1, rows=2, frame_width=1, frame_color=color.black)
        _row = 0
        table.cell(settings, column=0, row=0, text='DCA Settings', text_halign=text.align_left, text_size=size.small, text_color=color.white, bgcolor=get_bg_color_blue())

        _text = 'QFL: ' + str.tostring(i_strategy_type) + '; '
        _text := _text + 'Commision: ' + str.tostring(i_commision_percent) + '%;\n'
        _text := _text + 'Condition: ' + str.tostring(deal_start_condition) + ' '
        _text := _text + 'TP: ' + str.tostring(i_take_profit_perc) + '% '
        _text := _text + ' (' + str.tostring(i_take_profit_type) + ')'
        if i_enable_stop_loss
            _text := _text + '\nSL: ' + str.tostring(i_stop_loss_perc) + '%'
        _text := _text + '\n\n'

        _text := _text + 'BO: ' + str.tostring(i_base_order_size_usd) + ' ' + str.tostring(syminfo.currency) + '; '
        _text := _text + 'SO: ' + str.tostring(i_safety_order_size_usd) + ' ' + str.tostring(syminfo.currency) + ';\n'
        _text := _text + 'SO Dev: ' + str.tostring(i_safety_order_price_deviation_perc) + '% ; '
        _text := _text + 'Max SO: ' + str.tostring(i_max_safety_orders) + '; '
        _text := _text + 'Covered: ' + str.tostring(math.round(stepped_deviation(i_max_safety_orders), 2)) + ' %;\n'
        _text := _text + 'SO Volume Scale: ' + str.tostring(i_safety_order_volume_scale) + '; '
        _text := _text + 'SO Step Scale: ' + str.tostring(i_safety_order_price_step_scale) + ';\n'
        

        table.cell(settings, column=0, row=1, text=_text, text_halign=text.align_left, text_color=color.black, text_size=size.small, bgcolor=get_bg_color_grey(_row))




