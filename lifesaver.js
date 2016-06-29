// TODO look at https://tools.ietf.org/html/rfc3548
// TODO https://github.com/google/google-authenticator/wiki/Key-Uri-Format
// TODO make sure I have the keys handled properly

document.write('<div id="init"></div><div id="grid"></div><div id="verify"></div><div id="link"></div><div id="entry"></div><div id="otp"></div>');

var __GRID_SIZE__ = 17; // min integer n such that (n^2 choose 50/s) * (50/s)! >= 16^50
var __PART_SIZE__ = 2; // at most 8

function hexFromRFC3548Base32(key32){
    var language = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var clean = key32.toUpperCase().replace(/[^ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]/g, "");
    while (clean.length % 40 !== 0){
        clean += "=";
    }
    
    var bits = "";
    for (var i=0; i < clean.length; ++i){
        if (clean[i] === "="){
            bits += "00000";
        } else {
            var index = language.indexOf(clean[i]);
            bits += ("00000"+(index).toString(2)).substr(-5);
        }
    }

    var key16 = "";
    for (var i=0; i < bits.length; i += 4){
        key16 += parseInt(bits.substr(i, 4), 2).toString(16);
    }
    
    return key16;
}

var SECRET_KEY = "";
var T0 = 0;
var TS = 30;
var STATE_HB_OFFSET = 0;
var STATE_VB_ENTRY = "";
var STATE_VB_COUNT = 0;
var STATE_EB_LENGTH = 0;
var STATE_EB_ENTRY = "";

function hideAll(){
    var init = document.getElementById("init");
    var grid = document.getElementById("grid");
    var verify = document.getElementById("verify");
    var link = document.getElementById("link");
    var entry = document.getElementById("entry");
    var otp = document.getElementById("otp");
    init.style.display = "none";
    grid.style.display = "none";
    verify.style.display = "none";
    link.style.display = "none";
    entry.style.display = "none";
    otp.style.display = "none";
}

function toInit(){
    hideAll();
    var init = document.getElementById("init");
    init.style.display = "block";
    
    SECRET_KEY = "";
    T0 = 0;
    TS = 30;
    init.innerHTML = "<h1>Configure</h1>";
    var b32_input = document.createElement("input");
    var b16_input = document.createElement("input");
    var t0_input = document.createElement("input");
    var ts_input = document.createElement("input");
    var b32_label = document.createElement("label");
    var b16_label = document.createElement("label");
    var t0_label = document.createElement("label");
    var ts_label = document.createElement("label");
    b32_input.value = "";
    b16_input.value = "";
    t0_input.value = "0";
    ts_input.value = "30";
    b32_label.innerHTML = "Secret Key (base32) ";
    b16_label.innerHTML = "Secret Key (base16) ";
    t0_label.innerHTML = "T0 ";
    ts_label.innerHTML = "TS ";
    init.appendChild(b32_label);
    init.appendChild(b16_label);
    init.appendChild(t0_label);
    init.appendChild(ts_label);
    b32_label.appendChild(b32_input);
    b16_label.appendChild(b16_input);
    t0_label.appendChild(t0_input);
    ts_label.appendChild(ts_input);
    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.value = "Submit";
    init.appendChild(submit);
    submit.onclick = handleInitButton;
    init.b32 = b32_input;
    init.b16 = b16_input;
    init.t0 = t0_input;
    init.ts = ts_input;
}

function handleInitButton(){
    var init = document.getElementById("init");
    SECRET_KEY = init.b16.value.toUpperCase() ||
           hexFromRFC3548Base32(init.b32.value).toUpperCase().replace(/(00)+$/, "");
    T0 = parseInt(init.t0.value);
    TS = parseInt(init.ts.value);
    toGrid();
}

function toGrid(){
    hideAll();
    var grid = document.getElementById("grid");
    grid.style.display = "block";

    STATE_HB_OFFSET = 0;
    grid.innerHTML = "<h1>Set Pattern</h1>";
    grid.buttons = [];
    for (var i=0; i < __GRID_SIZE__; ++i){
        grid.buttons.push([]);
        for (var j=0; j < __GRID_SIZE__; ++j){
            var b = document.createElement("button");
            b.innerHTML = "&nbsp;";
            b.setAttribute("i", i);
            b.setAttribute("j", j);
            b.onclick = handleGridButton;
            grid.buttons[i].push(b);
            grid.appendChild(b);
        }
    }
}

function handleGridButton(){
    if (this.innerHTML === "&nbsp;"){
        this.setAttribute("disabled", "disabled");
        this.innerHTML = SECRET_KEY.substr(STATE_HB_OFFSET, __PART_SIZE__);
        STATE_HB_OFFSET += __PART_SIZE__;
        if (STATE_HB_OFFSET === SECRET_KEY.length){
            toVerify();
        }
    }
}

function toVerify(keep_count){
    hideAll();
    var verify = document.getElementById("verify");
    verify.style.display = "block";

    STATE_VB_ENTRY = "";
    verify.innerHTML = "<h1>Verify Pattern "+(1+STATE_VB_COUNT)+"/3</h1>";
    if (keep_count){
        for (var i=0; i < __GRID_SIZE__; ++i){
            for (var j=0; j < __GRID_SIZE__; ++j){
                var b = document.createElement("button");
                b.innerHTML = verify.buttons[i][j].innerHTML;
                b.setAttribute("i", i);
                b.setAttribute("j", j);
                b.onclick = handleVerifyButton;
                verify.buttons[i].push(b);
                verify.appendChild(b);
            }
        }
    } else {
        STATE_VB_COUNT = 0;
        verify.buttons = [];
        for (var i=0; i < __GRID_SIZE__; ++i){
            verify.buttons.push([]);
            for (var j=0; j < __GRID_SIZE__; ++j){
                var b = document.createElement("button");
                b.innerHTML = grid.buttons[i][j].innerHTML;
                if (b.innerHTML === "&nbsp;"){
                    b.innerHTML = ("00000000" + Math.random().toString(16).slice(2, 2+__PART_SIZE__).toUpperCase()).slice(-__PART_SIZE__);
                }
                b.setAttribute("i", i);
                b.setAttribute("j", j);
                b.onclick = handleVerifyButton;
                verify.buttons[i].push(b);
                verify.appendChild(b);
            }
        }
    }
}

function handleVerifyButton(){
    STATE_VB_ENTRY += this.innerHTML;
    this.setAttribute("disabled", "disabled");
    if (STATE_VB_ENTRY.length === SECRET_KEY.length){
        if (STATE_VB_ENTRY === SECRET_KEY){
            ++STATE_VB_COUNT;
            if (STATE_VB_COUNT < 3){
                toVerify(true);
            } else {
                toLink();
            }
        } else {
            toGrid();
        }
    }
}

function toLink(){
    hideAll();
    var link = document.getElementById("link");
    link.style.display = "block";

    link.innerHTML = "<h1>OTP Link</h1>";
    var data = [];
    for (var i=0; i < __GRID_SIZE__; ++i){
        data.push([]);
        for (var j=0; j < __GRID_SIZE__; ++j){
            data[i].push(verify.buttons[i][j].innerHTML);
        }
    }
    var datajson = JSON.stringify(data);
    var html = '<script src="http://crypto-js.googlecode.com/files/2.0.0-crypto-sha1.js"></'+'script>'+
               '<script src="http://crypto-js.googlecode.com/files/2.0.0-hmac-min.js"></'+'script>'+
               '<script src="http://www.foo.be/hotp/hotp/hotp.js"></'+'script>'+
               '<link rel="stylesheet" href="http://jupyter.snotskie.com:8888/files/otp/lifesaver.css" />'+
               '<script src="http://jupyter.snotskie.com:8888/files/otp/lifesaver.js"></'+'script>'+
               '<script>toEntry('+SECRET_KEY.length+', '+datajson+', '+T0+', '+TS+')</'+'script>';
    var url = 'data:text/html,'+html;
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.innerHTML = "Here is the url";
    link.appendChild(a);
}

function toEntry(length, data, t0, ts){
    hideAll();
    var entry = document.getElementById("entry");
    entry.style.display = "block";

    entry.innerHTML = "<h1>Enter Pattern</h1>";
    entry.buttons = [];
    STATE_EB_LENGTH = length;
    STATE_EB_ENTRY = "";
    T0 = t0;
    TS = ts;
    for (var i=0; i < __GRID_SIZE__; ++i){
        entry.buttons.push([]);
        for (var j=0; j < __GRID_SIZE__; ++j){
            var b = document.createElement("button");
            b.innerHTML = data[i][j];
            b.setAttribute("i", i);
            b.setAttribute("j", j);
            b.onclick = handleEntryButton;
            entry.buttons[i].push(b);
            entry.appendChild(b);
        }
    }
}

function handleEntryButton(){
    STATE_EB_ENTRY += this.innerHTML;
    this.setAttribute("disabled", "disabled");
    if (STATE_EB_ENTRY.length === STATE_EB_LENGTH){
        toOTP();
    }
}

function toOTP(){
    hideAll();
    var otp = document.getElementById("otp");
    otp.style.display = "block";

    otp.innerHTML = "";
    var key = STATE_EB_ENTRY;
    while (key.length % 50 != 0){
        key += "0";
    }
    
    var output = calculateOTP(key);
    var h = document.createElement("h1");
    h.innerHTML = output;
    otp.appendChild(h);
    document.title = output;
    window.setTimeout(toOTP, 1000);
}

function calculateOTP(key){
    var time = Math.floor(Date.now()/1000);
    return hotp(key, Math.floor((time-T0)/TS), "dec6");
}