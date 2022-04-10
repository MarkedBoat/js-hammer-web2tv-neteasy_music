let alertMsg = function (msg) {
    kl.log(msg);
    alert(msg);
};


let timerCfg = {
    flagMap: {},
    triggers: [],
    triggerMap: {},
    counts: 0,
};

/**
 *
 * @param flag   执行之前会检查flag, true：执行  false:取消
 * @param start 多少 n*0.1秒后执行,不受size影响
 * @param ttl   从上面计多少次结束,不受size影响
 * @param interval   时间间隔，精度为0.1秒，可能有用的不多的
 * @param in_fun   在世界范围执行什么方法
 * @param out_fun 退出时执行什么方法？
 * {flag: flag, start: start, interval: interval, ttl: ttl, in_fun: dd, out_fun: fun,is_close:false}
 *
 */
let addTimerTrigger = function (input_param) {
    if (timerCfg.flagMap[input_param.flag] === undefined) {
        timerCfg.flagMap[input_param.flag] = input_param.is_close === undefined ? true : !input_param.is_close;
        let tmp_index = timerCfg.triggers.length;
        timerCfg.triggers.push(
            {
                flag: input_param.flag,
                start: input_param.start < 1 ? -1 : (timerCfg.counts + input_param.start),
                end: input_param.ttl === -1 ? -1 : (timerCfg.counts + input_param.start + (input_param.ttl === 0 ? input_param.interval : input_param.ttl)),
                mod: input_param.interval,
                inFun: input_param.in_fun,
                outFun: input_param.out_fun,
                closeFlag: function () {
                    console.log('closeFlag:', input_param.flag);
                    timerCfg.flagMap[input_param.flag] = false;
                },
                openFlag: function () {
                    console.log('openFlag:', input_param.flag);
                    timerCfg.flagMap[input_param.flag] = true;
                },
                isFlagOpen: function () {
                    return timerCfg.flagMap[input_param.flag];
                }
            }
        );
        timerCfg.triggers[tmp_index].setNewTtl = function (start, ttl, in_fun, out_fun) {
            timerCfg.triggers[tmp_index].start = start < 1 ? -1 : (timerCfg.counts + start);
            timerCfg.triggers[tmp_index].end = ttl === -1 ? -1 : (timerCfg.counts + start + (ttl === 0 ? timerCfg.triggers[tmp_index].interval : ttl));
            timerCfg.flagMap[input_param.flag] = true;
            if (typeof in_fun === 'function') {
                timerCfg.triggers[tmp_index].inFun = in_fun;
            }
            if (typeof out_fun === 'function') {
                timerCfg.triggers[tmp_index].outFun = out_fun;
            }
            return timerCfg.triggers[tmp_index];
        };
        timerCfg.triggerMap[input_param.flag] = timerCfg.triggers[tmp_index];
        return timerCfg.triggers[tmp_index];
    } else {
        throw  'addTimerTrigger 已经存在:' + input_param.flag;
    }
};

let isTimerTriggerExist = function (flag) {
    return !(timerCfg.flagMap[flag] === undefined);
};
let getTimerTrigger = function (flag) {
    return timerCfg.triggerMap[flag];
};

setInterval(function () {
    timerCfg.counts = timerCfg.counts + 1;
    timerCfg.triggers.forEach(function (trigger, index) {
        //  console.log(trigger.flag, timerCfg.flagMap[trigger.flag], trigger, timerCfg.counts,                "\nmod:", timerCfg.counts % trigger.mod === 0,                "\nnot yet:", trigger.start > -1 && trigger.start < timerCfg.counts,                "\nout:", trigger.end > -1 && trigger.end < timerCfg.counts);
        if (trigger.isFlagOpen() && timerCfg.counts % trigger.mod === 0) {
            //  console.log(trigger.flag, timerCfg.flagMap[trigger.flag], trigger, timerCfg.counts,                "\nmod:", timerCfg.counts % trigger.mod === 0,                "\nnot yet:", trigger.start > -1 && trigger.start < timerCfg.counts,                "\nout:", trigger.end > -1 && trigger.end < timerCfg.counts);
            if (trigger.start > -1 && trigger.start < timerCfg.counts) {
                //不是 无限次的，又没到 开始的时间,-1  无限， 0，一次，
                //console.log('not yet:',);
                return false;
            }
            if (trigger.end > -1 && trigger.end < timerCfg.counts) {
                //console.log('outer:',);
                trigger.closeFlag();
                trigger.outFun(trigger, timerCfg.counts);
            } else {
                //console.log('in:',);
                trigger.inFun(trigger, timerCfg.counts);
            }
        }
    });
}, 100);
