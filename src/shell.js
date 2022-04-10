// ==UserScript==
// @name         hammerWeb2TV-网易云音乐
// @namespace    http://tampermonkey.net/
// @version      *
// @description  在电视上听使用网易云,目前只能听歌…… https://markedboat.com/cors/tampermonkey_release?browser=kiwi&name=music.163.com
// @author       You
// @include      https://music.163.com/*
// @include      https://y.music.163.com/*
// @grant        unsafeWindow
// @grant window.close
// @grant window.focus
// @run-at document-start
// @updateURL    *
// @downloadURL  *
// ==/UserScript==

(function () {
    'use strict';
    let record_xhr = true;
    let auto_clean = true;

    let stopRecordXhr = function () {
        console.log('stopRecordXhr record_xhr=false');
        record_xhr = false;
    };
    let keepRecordXhr = function () {
        console.log('keepRecordXhr record_xhr=true');
        record_xhr = true;
    };


    //插件为了防止浏览器被写爆，插件入口设置了保险，会自动清理Storage,如果有website的程序接手，那就需要解除 插件入口保险,不适合在 website/index 调用
    let shutdowDefaultXhrStorageCleaner = function (flag) {
        top.window.kl.log('shutdowDefaultXhrStorageCleaner kl_kiwi_js_xhr_record_data_default_cleaner ', flag);
        auto_clean = false;
    };


    // Object.defineProperty(realXHR, 'onreadystatechange', {
    //     get: function() {
    //         console.log('get：realXHR.onreadystatechange' );
    //         return onreadystatechange;
    //     },
    //     set: function(value) {
    //         onreadystatechange = value;
    //         console.log('set:realXHR.onreadystatechange' );
    //     }
    // });


    window.setTimeout(function () {
        console.log(((self == top) ? 'top' : 'iframe') + (':' + document.location.href) + "\n" + '都15秒了，不能把浏览器写炸了,清理 kiwi_js_xhr_record_data,为了保险，延迟10秒');//定时器的number 会重复，所以改用随机数
        console.log('kl_kiwi_js_xhr_record_data_default_cleaner', localStorage.getItem('kl_kiwi_js_xhr_record_data_default_cleaner'));

        if (auto_clean == false) {
            console.log('kl_kiwi_js_xhr_record_data_default_cleaner === false ,不清理');
            return false;
        } else {
            console.log('kl_kiwi_js_xhr_record_data_default_cleaner !== false ,清理！！！');
        }
        stopRecordXhr();
        setTimeout(function () {
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i); //获取本地存储的Key
                if (key.indexOf('kiwi_js_xhr_') === 0) {
                    localStorage.removeItem(key);
                }
            }
        }, 10 * 1000);
    }, 15 * 1000);


    if (document.location.href.indexOf('https://music.163.com/login') != 0 && document.location.href.indexOf('https://music.163.com/#/login') !== 0 && XMLHttpRequest.prototype.realOpen3 === undefined) {//网易云自己也改写了个realOpen……  重名了
        XMLHttpRequest.prototype._kl_info = {url: '', method: '', sync: false, headers: []};
        console.log('XMLHttpRequest.prototype.realOpen3', XMLHttpRequest.prototype.realOpen3);
        XMLHttpRequest.prototype.realSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
            this.realSetRequestHeader(k, v);
            this._kl_info.headers.push({k: k, v: v});
        };

        XMLHttpRequest.prototype.realOpen3 = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, sync) {
            sync = sync === undefined;
            this._kl_info.url = url;
            this._kl_info.method = method;
            this._kl_info.sync = sync;
            this.realOpen3(method, url, sync);
        };

        let xhr_record_prefix_urls = [
            'v6/playlist/detail?csrf_token',
            'song/lyric?csrf_token',
            'song/enhance/player/url/v1?csrf_token'
        ];

        XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (value) {
            let xhr = this;
            xhr_record_prefix_urls.forEach(function (prefix_url) {
                let tmp_index = xhr._kl_info.url.indexOf(prefix_url);
                //console.log(xhr._kl_info.url, prefix_url, tmp_index, tmp_index > -1);
                if (tmp_index > -1) {
                    console.log("\nrecord_XHR_send \n", xhr._kl_info.url);
                    let tmp_xhr = new XMLHttpRequest();
                    tmp_xhr.realOpen3(xhr._kl_info.method, xhr._kl_info.url, xhr._kl_info.sync);
                    xhr._kl_info.headers.forEach(function (h) {
                        tmp_xhr.realSetRequestHeader(h.k, h.v);
                    });
                    tmp_xhr.addEventListener("load", function () {//网易云的xhr又做了包装，正常监听load、readystate 都不会fire，搞不定，直接replay 简单粗暴
                        console.log("\nrecord_XHR_onload\n", tmp_xhr.responseURL,);
                        if (record_xhr) {
                            window.localStorage.setItem('kiwi_js_xhr_' + this.responseURL.replace(/http[s]?:\/\/(.*?)\/(.*)?\?(.*)?/, '$2').replace(/[:\/.]/ig, '').toString(), this.responseURL + '[kiwi_js_xhr_]' + this.responseText);
                        }
                    }, true);
                    tmp_xhr.realSend(value);
                }
            });
            this.realSend(value);
        };

    }


    if (self != top) {
        console.log('iframe中,上面的需要记录xhr,不重新加载不行，但是下面的大可不必', document.location.href);
        return false;//如果在ifrmae中，啥都不要干
    }


    window.localStorage.setItem('close_current_window', 'false');
    setInterval(function () {
        if (window.localStorage.getItem('close_current_window') === 'true') {
            window.close();
        }
    }, 200);


    document.realCreateElement = document.createElement;

    document.createElement = function (tagName) {
        if (tagName === 'audio' || tagName === 'AUDIO') {
            let tmp_audio = document.realCreateElement(tagName);
            tmp_audio.realPlay = tmp_audio.play;
            tmp_audio.play = function () {
                console.log('消除播放', tmp_audio.src);
            };
            return tmp_audio;

        }
        return document.realCreateElement(tagName);
    };

    console.log('开始引入');


    console.log('/src/kl-hammer.js');//伪代码，代表引用对应的文件
    //@include:/src/kl-hammer.js

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


    try {
        console.log('/src/grid.js');//伪代码，代表引用对应的文件

        //@include:/src/grid.js

        console.log('/src/index.js');

        //@include:/src/index.js

        console.log('/src/website.js');

        //@include:src/website.js

    } catch (e) {
        alert('出错了，刷新试试，如果刷新后还不行，那就洗洗睡吧');
        throw e;
    }


})();