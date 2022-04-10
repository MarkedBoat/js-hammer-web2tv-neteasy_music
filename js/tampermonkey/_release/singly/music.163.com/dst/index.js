// ==UserScript==
// @name         hammerWeb2TV-网易云音乐
// @namespace    http://tampermonkey.net/
// @version      0.20220411021838
// @description  在电视上听使用网易云,目前只能听歌…… https://markedboat.com/cors/tampermonkey_release?browser=kiwi&name=music.163.com
// @author       You
// @include      https://music.163.com/*
// @include      https://y.music.163.com/*
// @grant        unsafeWindow
// @grant window.close
// @grant window.focus
// @run-at document-start
// @updateURL    https://markedboat.com/cors/js_file?file=tampermonkey/_release/singly/music.163.com/dst/index.js
// @downloadURL  https://markedboat.com/cors/js_file?file=tampermonkey/_release/singly/music.163.com/dst/index.js
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


    let is_xhr_page = false;
    ['song?id=', 'playlist?id='].map(function (tmp_url) {
        if (is_xhr_page === false) {
            is_xhr_page = document.location.href.indexOf(tmp_url) > 0;
        }
    });
    console.log(is_xhr_page);

    if (is_xhr_page && XMLHttpRequest.prototype.realOpen3 === undefined) {//网易云自己也改写了个realOpen……  重名了
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
                    xhr._kl_info.headers=[];
                }
            });
            this.realSend(value);
            this._kl_info.headers = [];
        };


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

    }


    if (self != top) {
        console.log('iframe中,上面的需要记录xhr,不重新加载不行，但是下面的大可不必', document.location.href);
        return false;//如果在ifrmae中，啥都不要干
    }


    setInterval(function () {
        if (top && top.window && top.window.kl && top.window.kl.closeCurrentWindow === true) {
            console.log('尝试关闭 closeCurrentWindow');
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


    /*************************************************************************************************
     *
     * 引入业务相关
     *
     *************************************************************************************************/
    console.log('开始引入');

    try {

        console.log('hammer/kl-hammer.js');

        /**
 * Created by markedboat on 2019/12/19.
 */

// Object.prototype.isStdArray = function () {
//     return typeof this.forEach === 'function';
// };
let KL = function () {
    let self = this;
    self.opt = {log: true};
    self.isset = function (arg) {
        return typeof arg === 'undefined' ? false : true;
    };
    self.id = function (id) {
        return document.getElementById(id);
    };
    self.isUndefined = function (baseVar, attr_path) {
        let tmp_ar = attr_path.split('.');
        return tmp_ar.reduce(function (base_var, attr) {
            // console.log(base_var, attr, base_var[attr], 'xxxx');
            return base_var === undefined || typeof base_var[attr] === 'undefined' ? undefined : base_var[attr];
        }, baseVar) === undefined;
    };
    self.xpathSearch = function (xpath, context) {
        let nodes = [];
        try {
            let doc = (context && context.ownerDocument) || window.document;
            let results = doc.evaluate(xpath, context || doc, null, XPathResult.ANY_TYPE, null);
            let node;
            while (node = results.iterateNext()) {
                nodes.push(node);
            }
        } catch (e) {
            throw e;
        }
        return nodes;
    };


    self.getCookie = function (cookie_name) {
        let cks = document.cookie.split(';');
        for (let i = 0; i < cks.length; i++) {
            if (cks[i].search(cookie_name) !== -1) {
                return decodeURIComponent(cks[i].replace(cookie_name + '=', ''));
            }
        }
    };

    self.setCookie = function (name, val, day, domain) {
        let date = new Date();
        date.setTime(date.getTime() + day * 24 * 3600 * 1000);
        let time_out = date.toGMTString();
        //console.log(time_out, val);
        document.cookie = name + '=' + encodeURIComponent(val) + ';expires=' + time_out + ';path=/;domain=' + domain;
    };
    /**
     * 将多维 object 转化成 from的key=>name
     * @param fromData
     * @param input_data
     * @param level
     * @param name_root
     */
    self.data2form = function (fromData, input_data, level, name_root) {
        if (level === 0) {
            for (let k in input_data) {
                if (typeof input_data[k] === 'object') {
                    self.data2form(fromData, input_data[k], 1, k);
                } else {
                    fromData.append(k, input_data[k]);
                }
            }
        } else {
            for (let k in input_data) {
                if (typeof input_data[k] === 'object') {
                    self.data2form(fromData, input_data[k], level + 1, name_root + '[' + k + ']');
                } else {
                    fromData.append(name_root + '[' + k + ']', input_data[k]);
                }
            }
        }
    };


    /**
     *
     * @param opts
     */
    self.ajax = function (opts) {
        let request = new XMLHttpRequest();
        opts.httpOkCodes = opts.httpOkCodes || [];
        request.timeout = (opts.timeout || 30) * 1000;
        request.responseType = opts.responseType || request.responseType;
        request.addEventListener("load", function () {
            if (typeof opts.onload === 'function') {
                opts.onload(request);
            } else {
                if (request.status == 200 || opts.httpOkCodes.indexOf(request.status) !== -1) {
                    let result = request.responseText;
                    if (opts.type === 'json') {
                        try {
                            result = JSON.parse(request.responseText);
                        } catch (e) {
                            if (opts.error) {
                                opts.error('请求结果不能保存为 json');
                            }
                        }
                    }
                    opts.success(result);
                } else {
                    if (opts.error) {
                        opts.error(request.status + ':' + request.statusText);
                    }
                }
            }

        }, false);
        request.addEventListener("error", function () {
            console.log('出错了');
            if (opts.error) opts.error(request.statusText, 'error');
        }, false);
        request.addEventListener("abort", function () {
            console.log('中断了');
            if (opts.error) opts.error(request.statusText, 'abort');
        }, false);

        if (opts.progress) {
            request.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    opts.progress(evt.loaded, evt.total);
                }
            }, false);
        }


        //request.onreadystatechange = requestCallback;
        request.open((opts.method || "POST"), opts.url, true);
        if (opts.isAjax !== false) request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        //request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        if (opts.form) {
            request.send(opts.form);
        } else {
            let fromData = new FormData();
            self.data2form(fromData, opts.data, 0, '');
            request.send(fromData);
        }

    };
    self.getStack = function () {
        //    console.log.apply(function(){},arguments)
        return new Error().stack.replace('Error', 'Stack');
    };

    self.log = ((self.opt.log === true) || window.localStorage.getItem('hammer_opt_log') === 'on') && console && console.log ? console.log : function () {
    };

    return self;
};
let kl = new KL();
try {
    top.window.kl = kl;
} catch (e) {

}
let Emt = function (tagName, attrsStr, textContent, prototypeMap) {
    let ele = document.createElement(tagName);
    __ElementExt.call(ele);
    //t.prototype=new __ElementExt();
    if (typeof attrsStr === 'string') {
        ele.setAttrsByStr(attrsStr, textContent || '');
    }
    if (typeof prototypeMap === 'object') {
        ele.setPros(prototypeMap)
    }
    return ele;
};
let __ElementExt = function (tag) {
    // Elmt.prototype=new Emt(tag);
    let self = this;
    self.setStyle = function (configs) {
        for (let attr in configs)
            self.style[attr] = configs[attr];
        return self;
    };
    self.setPros = function (configs) {
        for (let attr in configs)
            self[attr] = configs[attr];
        return self;
    };
    /**
     * 设置句柄及索引
     * @param index_handler
     * @param index_name
     * @returns {Elmt}
     */
    self.setIndexHandler = function (index_handler, index_name) {
        index_handler[index_name] = self;
        self.indexHandler = index_handler;
        return self;
    };
    self.setAttrs = function (configs, isAddPrototype) {
        for (let attr in configs)
            self.setAttribute(attr, configs[attr]);
        if (isAddPrototype) for (let attr in configs)
            self[attr] = configs[attr];
        return self;
    };
    //必须是双引号的
    self.setAttrsByStr = function (raw_attrs_str, textContent) {
        let tmp_ar = raw_attrs_str.replace(/=\s?\"\s?/g, '=').replace(/\"\s+/g, '" ').replace(/\s?\:\s?/g, ':').split('" ');
        tmp_ar.forEach(function (tmp_str) {
            let tmp_ar2 = tmp_str.split('=');
            if (tmp_ar2.length === 2) {
                self.setAttribute(tmp_ar2[0].replace(/\s/g, ''), tmp_ar2[1].replace(/(^\s)|(\s$)|"/g, ''));
            }
        });
        if (typeof textContent === 'string') {
            self.textContent = textContent;
        }
        return self;
    };
    self.setEventListener = function (event, fn) {
        self.addEventListener(event, fn);
        return self;
    };
    self.bindEvent = function (event, fn) {
        self.addEventListener(event, fn);
        return self;
    };
    /**
     *
     * @param opts
     let opts = {
            path: 'premit.startTime',
            domData: domData
         }
     * @returns {Elmt}
     */
    self.bindData = function (opts) {
        opts.ele = self;
        opts.domData.bindData(opts);
        return self;
    };

    self.addNode = function () {
        for (let i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] !== 'string') {
                self.appendChild(arguments[i]);
                arguments[i].boss = self;
                arguments[i].parent = self;
                if (typeof arguments[i + 1] === 'string') {
                    if (arguments[i + 1]) self[arguments[i + 1]] = arguments[i];
                }
            }
        }
        return self;
    };
    self.addNodes = function (nodes) {
        for (let i in nodes) {
            let node = nodes[i];
            if (typeof node === 'string') {
                self.innerHTML += node;
            } else {
                nodes.boss = self;
                self.appendChild(node);
                (node.eleParent || self)[node.eleName || i] = node;
            }

        }
        return self;
    };
    self.toggleClassList = function (class_name, is_add) {
        if (typeof is_add === 'undefined') {
            self.classList.toggle(class_name);
        } else if (is_add) {
            self.classList.add(class_name);
        } else {
            self.classList.remove(class_name);
        }
        return self;
    };


    self.select_item_vals = [];
    self.select_item_eles = [];

    self.addSelectItem = function (val, text, is_default) {
        if (self.tagName === 'SELECT') {
            if (self.select_item_vals.indexOf(val) === -1) {
                self.select_item_vals.push(val);
                let opt = new Option(text, val);
                opt.is_default = is_default;
                opt.val = val;
                self.select_item_eles.push();
                self.add(opt);
                if (is_default) {
                    self.value = val;
                }
            }
        } else {
            console.log('调用错误，非select 不能使用 addSelectItem 方法');
        }
    };

    /**
     *
     * @param list [ {val:xx,text:xx,is_default:true/false} ]
     * @returns {Elmt}
     */
    self.addSelectItemList = function (list) {
        if (typeof list.forEach === 'function') {
            list.forEach(function (info) {
                self.addSelectItem(info.val || '', info.text || '', info.is_default || '')
            });
        }
        return self;
    };
    self.clearSelectItems = function (keep_dafault) {
        let index0 = 0;
        for (let i in self.select_item_eles) {
            if (keep_dafault === true && self.select_item_eles[index0].is_default === true) {
                console.log('保留', index0, self.select_item_eles[index0]);
                index0 = index0 + 1;
            }
            self.select_item_eles[index0].remove();
        }
        if (self.select_item_eles.length > 0) {
            if (keep_dafault === true) {
                self.select_item_vals = [self.select_item_eles[0].val];
            } else {
                self.select_item_vals = [];
            }
        }

    };


    return self;
};


function domLoaded(fn) {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('ready 1');
        fn();
    });
}

console.log('loaded hammer.js');


        console.log('tampermonkey/_release/singly/music.163.com/src/common.js');

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



        console.log('hammer/tv/grid.js');

        /********************************************************************************************************************************************************
 *  _  _   _   _  _ _  _ ____ ____      ___ _  _      ____ ____ _ ___
 *  |__|  /_\  |\/| |\/| |___ |__/       |  |  |      | __ |__/ | |  \
 *  |  | /   \ |  | |  | |___ |  \       |   \/       |__] |  \ | |__/
 *
 * 电视操作逻辑网格，提供交互逻辑的
 *******************************************************************************************************************************************************/
if (top.window.kl === undefined) {
    throw 'top.window.kl not init';
}
let HammerTvGridCellElement = function (input_data) {
    top.window.kl.log('HammerTvGridCellElement', input_data);
    let init_data = input_data || {tagName: 'button', attrStr: 'type="button"'};
    let btn_self = new Emt(init_data.tagName || 'button', init_data.attrStr || 'type="button"', init_data.textContent || '', init_data.pros || {});


    // let btn_self = new Emt('a', 'class="kl_kiwi_grid_cell" href="#"');

    btn_self.init_data = {text: 'button_text', link: '####', sourceData: {}};
    btn_self.isGridCellElement = true;
    btn_self.uiGridCell = false;
    btn_self.gridTable = false;


    btn_self.loadData = function (init_data) {
        btn_self.init_data = init_data;
        return btn_self;
    };
    btn_self.drawElement = function () {
        if (btn_self.init_data.text) {
            btn_self.textContent = btn_self.init_data.text;
        }
        if (init_data.appendElement) {
            btn_self.addNodes([init_data.appendElement])
        }
        //top.window.kl.log('HammerTvGridCellElement drawElement', init_data, btn_self);
        return btn_self;
    };
    btn_self.removeElement = function (msg) {
        top.window.kl.log(btn_self, 'remove:', msg);
        btn_self.remove();
    };
    btn_self.play = function () {
        if (btn_self.init_data.type === 'link') {
            window.location.href = btn_self.init_data.link;
        } else if (btn_self.init_data.type === 'fun') {
            btn_self.init_data.fun(btn_self);
        } else {
            alert(btn_self.init_data.handleKey);
        }
    };
    btn_self.focusSelf = function () {
        top.window.kl.log("fcousSelf", btn_self);
        top.window.kl.kiwiJs.golobInfo.lastUIGridCell = btn_self;
        btn_self.focus();
        return btn_self;
    };
    return btn_self;
};

/**
 * 只管单grid内的 逻辑，跳出就交给另外的
 * @constructor
 */
let HammerTvGrid = function () {
    let self = new Emt('table');
    self.config = {
        ui: {
            cols: 1, rows: 1, rowsIndexMax: 0, colsIndexMax: 0,
            lastX: 0, lastY: 0,//cell的坐标
        },
        directions: {
            left: false, right: false, top: false, down: false,
            scrollData: 'x',//触犯翻页方向,注意是小写
        }
    };

    self.uiGrid = [];// 界面网格
    self.dataGrid = [];//数据网格
    self.countMap = {
        trs: [],//临时一用
        currentDataGrid: [],//
        currentDataGridRowsStartIndex: 0,//代表渲染的rows 开始位置
        currentDataGridRowsEndIndex: 0,//代表渲染的rows 结束位置
        totalDataGridRowsEndIndex: 0,//代表结尾，不管有没有渲染
        currentUIGridMaxY10X: 0,//这个数，是loadGridData2UI后，数据填不满表格，以 y*10+x 得到最后一个可用UI 坐标，用以快速判断expect位置能否可用
        uiGridY10XMap: {},//Y10X:uiCell
        uiCellList: [],//[ uiCell,uiCell]
        uiCellTotal: 0,//
    };
    self.lockMap = {
        data2ui: false,
    };


    self.createTr = function () {
        let y = self.uiGrid.length;
        let tr_self = self.insertRow();
        tr_self.grid_y = y;
        self.uiGrid.push([]);
        self.countMap.trs.push(tr_self);
        tr_self.createTd = function () {
            let td_self = tr_self.insertCell();
            let x = self.uiGrid[tr_self.grid_y].length;
            td_self.grid_y = tr_self.grid_y;
            td_self.grid_x = x;

            self.uiGrid[tr_self.grid_y][td_self.grid_x] = td_self;
            td_self.gridCellElement = false;

            td_self.setGridCellElement = function (gridCellElement) {
                td_self.closeCell('setGridCellElement');
                td_self.gridCellElement = gridCellElement;
                td_self.is_close = false;
                top.window.kl.log('setGridCellElement:new', gridCellElement);
                gridCellElement.uiGridCell = td_self;
                gridCellElement.gridTable = self;
                td_self.append(gridCellElement);
                return td_self;
            };

            td_self.closeCell = function (msg) {
                td_self.is_close = true;
                if (td_self.gridCellElement !== false) {
                    td_self.gridCellElement.removeElement(msg);
                    td_self.gridCellElement = false;
                }
                return td_self;
            };

            td_self.arrowKeyInput = function (arrow_direction) {
                top.window.kl.log('arrowKeyInput', arrow_direction);
                let dst_x = td_self.grid_x;
                let dst_y = td_self.grid_y;
                let x_or_y = 'x';
                let num = 1;
                switch (arrow_direction) {
                    case 'left':
                        dst_x = dst_x - 1;
                        num = -1;
                        break;
                    case 'top':
                        dst_y = dst_y - 1;
                        x_or_y = 'y';
                        num = -1;
                        break;
                    case 'right':
                        dst_x = dst_x + 1;
                        break;
                    case 'down':
                        dst_y = dst_y + 1;
                        x_or_y = 'y';
                        break;
                }
                self.tryFocusNextUICell({
                    from: {gridCell: td_self, x: td_self.grid_x, y: td_self.grid_y},
                    to: {x: dst_x, y: dst_y, y10x: dst_y * 10 + dst_x},
                    direction: arrow_direction,
                    number: num,
                    XorY: x_or_y
                });
            };
            td_self.focusCellElement = function (arrow) {
                top.window.kl.log('focusCellElement ');
                if (td_self.gridCellElement !== false) {
                    self.config.ui.lastX = td_self.grid_x;
                    self.config.ui.lastY = td_self.grid_y;
                    td_self.gridCellElement.focusSelf();
                } else {
                    top.window.kl.log('focusCellElement none', arrow);//坐标没超过ui,说明是数据没了
                    if (arrow === 'data2ui') {
                        let fix_y = self.countMap.currentDataGrid.length - 1;
                        fix_y = fix_y < self.config.ui.lastY ? fix_y : self.config.ui.lastY;
                        let fix_x = self.countMap.currentDataGrid[fix_y].length - 1;
                        fix_x = fix_x < self.config.ui.lastX ? fix_x : self.config.ui.lastX;
                        top.window.kl.log(fix_x, fix_y, self.uiGrid[fix_y][fix_x]);
                        self._focusUIGridCell(fix_x, fix_y, 'reset');
                    }


                }
                return td_self;
            };

            return td_self;
        };
        return tr_self;
    };

    /**
     * 设置行数
     * @param number
     * @returns {any}
     */
    self.setUIRowsNumber = function (number) {
        if (number > 10) {
            alert('setUIRowsNumber-行数-不要超过10个');
            throw 'setUIRowsNumber-行数-不要超过10个';
        }
        self.config.ui.rows = number;
        self.config.ui.rowsIndexMax = number - 1;
        return self;
    };

    /**
     * 设置列/栏数
     * @param number
     * @returns {any}
     */
    self.setUIColsNumber = function (number) {
        if (number > 10) {
            alert('setUIColsNumber-列数-不要超过10个');
            throw 'setUIColsNumber-列数-不要超过10个';
        }
        self.config.ui.cols = number;
        self.config.ui.colsIndexMax = number - 1;
        return self;
    };

    /**
     * 设置数据翻页的方向，暂时没见过 上下 或者  左右 都能刷新数据的，要么沿x轴要么y周，刷新ui页上的数据
     * @param direction x||y
     * @returns HammerTvGrid
     */
    self.setScrollDataDirection = function (direction) {
        let tmp_map = {x: 'x', X: 'x', y: 'y', Y: 'y'};
        if (tmp_map[direction] === undefined) {
            alert('setScrollDataDirection-参数错误');
            throw 'setScrollDataDirection-参数错误';
        }
        self.config.directions.scrollData = tmp_map[direction];
        return self;
    };

    /**
     * 获取当前网格 的 最后一个焦点单元格cell，哪怕现在它失去焦点了
     * @returns {*}
     */
    self.getLastUIGridCell = function () {
        return self.uiGrid[self.config.ui.lastY][self.config.ui.lastX];
    };

    /**
     * 选中下一个单元格cell,超乎当前ui网格，那么会加载下一页的数据，重现渲染ui网格
     * @return void
     */
    self.focusNextUIGridCell = function () {
        let current_cell_index = self.uiGrid[self.config.ui.lastY][self.config.ui.lastX].uiCellListIndex;
        top.window.kl.log('focusNextUIGridCell', self.uiGrid[self.config.ui.lastY][self.config.ui.lastX], current_cell_index);
        if (self.countMap.uiCellList[current_cell_index + 1] === undefined) {
            self.loadNextPage()._focusUIGridCell(0, 0, 'focus_next_cell');
        } else {
            top.window.kl.log('focusNextUIGridCell', self.countMap.uiCellList[current_cell_index + 1], self.countMap.uiCellList[current_cell_index + 1].uiCellListIndex);
            self.countMap.uiCellList[current_cell_index + 1].focusCellElement('auto');
        }
    };
    /**
     * 与focusNextUIGridCell类似，不过是反的
     *  @return void
     */
    self.focusPreUIGridCell = function () {
        let current_cell_index = self.uiGrid[self.config.ui.lastY][self.config.ui.lastX].uiCellListIndex;
        if (self.countMap.uiCellList[current_cell_index - 1] === undefined) {
            self.loadPrePage();
            if (self.countMap.uiCellList.length > 0){
                self.countMap.uiCellList[self.countMap.uiCellList.length - 1].focusCellElement('auto');
            }
        } else {
            self.countMap.uiCellList[current_cell_index - 1].focusCellElement('auto');
        }
    };


    /**
     * 生成ui表格
     * @return HammerTvGrid
     */
    self.drawUIGrid = function () {
        top.window.kl.log("\ndrawUIGrid\n");
        if (self.uiGrid[self.config.ui.rowsIndexMax] === undefined || self.uiGrid[self.config.ui.rowsIndexMax][self.config.ui.colsIndexMax] === undefined) {
            for (let y = 0; y < self.config.ui.rows; y++) {
                if (self.countMap.trs[y] === undefined) {
                    self.createTr();
                }
                for (let x = 0; x < self.config.ui.cols; x++) {
                    if (self.uiGrid[y][x] === undefined) {
                        let Y10X = y * 10 + x;
                        self.countMap.trs[y].createTd();
                        self.countMap.uiGridY10XMap[Y10X] = self.uiGrid[y][x];
                        self.uiGrid[y][x].uiCellListIndex = self.countMap.uiCellList.length;
                        self.countMap.uiCellList.push(self.uiGrid[y][x]);
                    }
                }
            }
            self.countMap.uiCellTotal = self.config.ui.rows * self.config.ui.cols;
        } else {
            top.window.kl.log("\ndrawUIGrid  不用再画");
        }
        return self;

    };

    /**
     * 加载原始的一维数组
     * @param source_data_array
     * @return HammerTvGrid
     */
    self.loadSourceArray = function (source_data_array) {
        let data_grid_rows_num = Math.ceil(source_data_array.length / self.config.ui.cols);
        self.dataGrid = [];
        if (source_data_array.length) {
            for (let y = 0; y < data_grid_rows_num; y++) {
                let tmp_start = y * self.config.ui.cols;
                self.dataGrid.push(source_data_array.slice(tmp_start, tmp_start + self.config.ui.cols));
                //console.log('0,3',self.sourceData.slice(0, 3));//0,1,2  不含 3
            }
        }
        self.countMap.totalDataGridRowsEndIndex = self.dataGrid.length - 1;

        return self;
    };

    /**
     * 渲染数据 到 UI 上，即 dataGrid -> uiGrid
     * @param auto_focus 自动选中焦点
     * @return HammerTvGrid
     */
    self.loadGridData2UI = function (auto_focus) {
        top.window.kl.log("\nloadGridData2UI\n");
        if (self.lockMap.data2ui) {
            top.window.kl.log("\nloadGridData2UI in locking\n");
            return self;
        }
        self.lockMap.data2ui = true;
        let last_y = -1;
        let last_x = -1;
        let fixed_y = 0;
        self.drawUIGrid();
        self.countMap.currentDataGrid = [];
        //top.window.kl.log('loadGridData2UI data',self.uiGrid,self.countMap.currentDataGridRowsStartIndex,self.dataGrid);

        self.uiGrid.forEach(function (tds, index_y) {
            tds.forEach(function (td, index_x) {
                self.uiGrid[index_y][index_x].closeCell('loadGridData2UI init y:' + index_y + ',x:' + index_x);
            });

            fixed_y = index_y + self.countMap.currentDataGridRowsStartIndex;//因为有翻页，所以要修正
            if (self.dataGrid[fixed_y]) {
                last_y = index_y;
                self.countMap.currentDataGrid.push(self.dataGrid[fixed_y]);
                //self.countMap.tdsRowColsLength.push(self.dataGrid[fixed_y].length);
                tds.forEach(function (td, index_x) {
                    try {
                        if (self.dataGrid[fixed_y][index_x]) {
                            last_x = index_x;
                            self.uiGrid[index_y][index_x].setGridCellElement(
                                (new HammerTvGridCellElement(self.dataGrid[fixed_y][index_x]))
                                    .loadData(self.dataGrid[fixed_y][index_x]).drawElement()
                            );
                        }
                    } catch (e) {
                        top.window.kl.log('ui:', index_x, index_y, "data:", index_x, fixed_y, "\nself.countMap.currentDataGridRowsStartIndex", self.countMap.currentDataGridRowsStartIndex, self.dataGrid);
                        throw e;
                    }

                });
            }
        });
        if (last_y === -1 && last_x === -1) {
            self.countMap.currentUIGridMaxY10X = -1;
            self.countMap.currentDataGridRowsEndIndex = -1;

        } else {
            self.countMap.currentUIGridMaxY10X = last_y * 10 + last_x;//限定行列数都不超过10，所以不用担心会重复
            self.countMap.currentDataGridRowsEndIndex = self.countMap.currentDataGridRowsStartIndex + last_y;
        }
        self.lockMap.data2ui = false;
        if (auto_focus === false) {
            return self;
        } else {
            return self._focusUIGridCell(self.config.ui.lastX, self.config.ui.lastY, 'data2ui');
        }
    };

    /**
     * 加载上一页的数据
     * @return HammerTvGrid
     */
    self.loadPrePage = function () {
        if (self.countMap.currentDataGridRowsStartIndex > 0) {
            self.countMap.currentDataGridRowsStartIndex = self.countMap.currentDataGridRowsStartIndex - self.config.ui.rows;
            return self.loadGridData2UI();
        } else {
            return self;
        }
    };

    /**
     * 加载下一页的数据
     * @return HammerTvGrid
     */
    self.loadNextPage = function () {
        if (self.countMap.currentDataGridRowsEndIndex < self.countMap.totalDataGridRowsEndIndex) {
            self.countMap.currentDataGridRowsStartIndex = self.countMap.currentDataGridRowsStartIndex + self.config.ui.rows;
            return self.loadGridData2UI();
        } else {
            return self;
        }
    };

    /**
     * 尝试挪到下一个 位置 /ui Cell
     * @param arrow_direction_info
     * @return HammerTvGrid
     */
    self.tryFocusNextUICell = function (arrow_direction_info) {
        top.window.kl.log("\ntryFocusNextUICell\n", arrow_direction_info);
        if (self.countMap.uiGridY10XMap[arrow_direction_info.to.y10x] === undefined) {
            //明显超出了,判断情况
            if (arrow_direction_info.XorY === self.config.directions.scrollData) {
                if (arrow_direction_info.number === -1) {
                    if (self.countMap.currentDataGridRowsStartIndex > 0) {
                        return self.loadPrePage();
                    }
                } else {
                    if (self.countMap.currentDataGridRowsEndIndex < (self.dataGrid.length - 1)) {
                        return self.loadNextPage();
                    }
                }
            }
            let direction = arrow_direction_info.direction;
            if (self.config.directions[direction] === false) {
                top.window.kl.log("\ntryFocusNextUICell direction=false \n");
            } else {
                if (self.config.directions[direction].isGrid) {
                    top.window.kl.log("\ntryFocusNextUICell direction -> next grid \n");
                    self.config.directions[direction].grid.focusUILastGridCell(false);
                } else if (self.config.directions[direction].isFun) {
                    top.window.kl.log("\ntryFocusNextUICell direction -> call fun \n");
                    self.config.directions[direction].fun();
                } else {
                    top.window.kl.log("\ntryFocusNextUICell direction what?????? \n");
                }
            }
        } else {
            top.window.kl.log("\n in rnage, tryFocusNextUICell -> focusUIGridCell \n", arrow_direction_info.to.x, arrow_direction_info.to.y,);
            self._focusUIGridCell(arrow_direction_info.to.x, arrow_direction_info.to.y, arrow_direction_info.direction);
        }
        //  let info = document.activeElement.gridCell.arrowKeyInput(arrow_direction);
        return self;
    };


    /**
     * 挪到ui 网格的指定 单元格/cell,不能超出
     * @param td_x
     * @param td_y
     * @param arrow
     * @return HammerTvGrid
     */
    self._focusUIGridCell = function (td_x, td_y, arrow) {
        top.window.kl.kiwiJs.golobInfo.currentGrid = self;
        top.window.kl.log(
            "\n------focusUIGridCell-------\n",
            td_x, td_y, arrow, "\n",
            self.config.ui.lastX, self.config.ui.lastY, self.uiGrid, "\n",
            "\n",
        );
        self.uiGrid[td_y][td_x].focusCellElement(arrow);

        return self;

    };
    /**
     * 挪到ui 网格的指定 单元格/cell,不能超出,  last 最后的，不是end那个结束末尾的
     * @param arrow
     * @return {HammerTvGrid}
     */
    self.focusUILastGridCell = function (arrow) {
        return self.getLastUIGridCell().focusCellElement(arrow);
    };

    /**
     * 某个方向 超出网格范围，去切换到另外个网格,这个是双向绑定
     * @param direction
     * @param hammerGridObject
     * @return HammerTvGrid
     */
    self.bindGrid = function (direction, hammer_grid_object) {
        let tmp_map = {left: 'right', right: 'left', top: 'down', down: 'top',};
        if (tmp_map[direction] === undefined) {
            alert('bindGrid-参数错误' + direction);
            throw 'bindGrid-参数错误';
        }
        self.config.directions[direction] = {isGrid: true, grid: hammer_grid_object};
        hammer_grid_object.config.directions[tmp_map[direction]] = {isGrid: true, grid: self};
        return self;
    };

    /**
     *  某个方向 超出网格范围，去触发什么函数
     * @param direction
     * @param fun
     * @return HammerTvGrid
     */
    self.bindDirectionFunction = function (direction, fun) {
        let tmp_map = {left: 'right', right: 'left', top: 'down', down: 'top',};
        if (tmp_map[direction] === undefined) {
            alert('bindDirectionFunction-参数错误' + direction);
            throw 'bindDirectionFunction-参数错误';
        }
        self.config.directions[direction] = {isFun: true, fun: fun};
        return self;
    };

    return self;

};

if (top.window.kl.tvGridListening !== true) {
    top.window.kl.tvGridListening = true;
    document.onkeydown = function (e) {
        top.window.kl.log('key_down', top.window.kl.kiwiJs.golobInfo.keepActive, e.target.isGridCellElement);
        if (top.window.kl.kiwiJs.golobInfo.keepActive) {
            let tmp_ele = false;
            if (e.target.isGridCellElement !== true) {
                top.window.kl.log('不是isGridCellElement?', e.target);
                tmp_ele = top.window.kl.kiwiJs.golobInfo.lastUIGridCell.focusSelf();
            } else {
                tmp_ele = e.target;
            }
            console.clear || console.clear();
            let keyCode = e.key || 'e.key';
            let whichCode = e.which || 'e.which';
            // 37 l  38 top  39 right  40 down
            if ([13, 37, 38, 39, 40].indexOf(whichCode) !== -1) {

                //root_div.classList.remove('hide');
                switch (whichCode) {
                    case 13:
                        //ok
                        top.window.kl.log(document.activeElement);
                        document.activeElement.play();
                        break;
                    case 37:
                        tmp_ele.uiGridCell.arrowKeyInput('left');
                        break;
                    case 38:
                        tmp_ele.uiGridCell.arrowKeyInput('top');
                        break;
                    case 39:
                        tmp_ele.uiGridCell.arrowKeyInput('right');
                        break;
                    case 40:
                        tmp_ele.uiGridCell.arrowKeyInput('down');
                        break;
                }
                // e.preventDefault();
                // return false;
            }

        } else {
            // if (currentInfo.keep_hide === false && [13, 37, 38, 39, 40].indexOf(whichCode) !== -1) {
            // HammerTvGrid.golobInfo.currentGrid._focusUIGridCell(false, false, 'reset');
        }
    };
}





        console.log('tampermonkey/_release/singly/music.163.com/src/layout.js');

        /********************************************************************************************************************************************************
 *   ___ ____ _  _ _  _ ____ _  _      _ _  _ ___  ____ _  _
 *  /    |  | |\/| |\/| |  | |\ |      | |\ | |  \ |___  \/
 *  \__  |__| |  | |  | |__| | \|      | | \| |__/ |___ _/\_
 *
 * 提供统一入口的，首页、导航之类的
 *******************************************************************************************************************************************************/

(function () {

        if (top.window.kl.kiwiJs === undefined) {
            let tmp_zindex = 999999;
            top.window.kl.kiwiJs = {
                config: {
                    css: {
                        msg: {zIndex: tmp_zindex},
                        audio: {zIndex: tmp_zindex - 1},
                        topMenu: {zIndex: tmp_zindex - 1},
                        switch: {zIndex: tmp_zindex - 6},
                        comment: {zIndex: tmp_zindex - 6},
                        lyric: {zIndex: tmp_zindex - 7},
                        songList: {zIndex: tmp_zindex - 8},
                        common: {zIndex: tmp_zindex - 9},
                        root: {zIndex: tmp_zindex - 10},
                    }
                },
                root_div: false,
                golobInfo: {currentGrid: false, keepActive: true, lastUIGridCell: false},
                hideMsg: function () {
                },
                showMsg: function () {
                },

            };
        } else {
            top.window.kl.log('经初始化了，现在是iframe触发的，不用管了');
            return false;
        }

        if (top.window.kl === undefined) {
            throw 'top.window.kl not init';
        }


        //为了解决 注入脚本之前 的ajax 带有关键信息，所以写一些到 localStorage 里，但是这些东西需要读出来

        top.window.kl.kiwiJs.captureXhrRecorder = {
            keepScanStatus: true,
            triggers: [
                {
                    url: 'xxx', fun: function (obj) {
                    }
                }
            ],
        };
        top.window.kl.kiwiJs.captureXhrRecorder.triggers = [];//上面数据，做演示结构用的

        top.window.kl.kiwiJs.captureXhrRecorder.cleanXhrRecord = function (is_callback) {
            for (let i = 0; i < window.localStorage.length; i++) {
                let key = window.localStorage.key(i); //获取本地存储的Key
                if (key.indexOf('kiwi_js_xhr_') === 0) {
                    if (is_callback === true) {
                        let tmp_ar = window.localStorage.getItem(key).split('[kiwi_js_xhr_]');
                        if (tmp_ar.length === 2) {
                            top.window.kl.kiwiJs.captureXhrRecorder.triggers.forEach(function (trigger_info, trigger_index) {
                                if (trigger_info.isClose === false && tmp_ar[0].indexOf(trigger_info.url) > -1) {
                                    trigger_info.fun({
                                        key: key,
                                        url: tmp_ar[0],
                                        text: tmp_ar[1],
                                        close: function () {
                                            top.window.kl.kiwiJs.captureXhrRecorder.triggers[trigger_index].isClose = true;
                                        }
                                    });
                                }
                            });
                        }
                    }
                    window.localStorage.removeItem(key);
                }
            }
        };
        //节省资源开始的，不必要的话，还是少扫磁盘
        top.window.kl.kiwiJs.captureXhrRecorder.stopScan = function () {
            top.window.kl.kiwiJs.captureXhrRecorder.keepScanStatus = false;
        };
        top.window.kl.kiwiJs.captureXhrRecorder.keepScan = function () {
            top.window.kl.kiwiJs.captureXhrRecorder.keepScanStatus = true;
        };
        //添加触发器,
        top.window.kl.kiwiJs.captureXhrRecorder.addTrigger = function (url, fun) {
            top.window.kl.kiwiJs.captureXhrRecorder.triggers.push({url: url, fun: fun, isClose: false});
        };
        //持续性 扫localStorage中的 xhr recorder
        setInterval(function () {
            if (top.window.kl.kiwiJs.captureXhrRecorder.keepScanStatus) {
                top.window.kl.kiwiJs.captureXhrRecorder.cleanXhrRecord(true);
            }
        }, 100);


        let root_div = new Emt('div', 'id="kl_kiwi_menu_root" class="big_btn_div kl_kiwi_menu_root" ');
        top.window.kl.kiwiJs.root_div = root_div;


        let menu_map_top_btns = [
            {
                text: '关闭页面', handleKey: 'test', type: 'fun', fun: function () {
                    // window.close();
                    top.window.kl.closeCurrentWindow = true;
                }
            },
            {
                text: '隐藏窗口', handleKey: 'test', type: 'fun', fun: function () {
                    root_div.classList.add('keep_hide');
                }
            },
            {text: '网易云音乐', handleKey: 'pre', type: 'link', link: 'https://music.163.com/my'},

        ];


        let website_grid = (new HammerTvGrid()).setUIColsNumber(3).setUIRowsNumber(1);
        top.window.kl.kiwiJs.root_div.addNodes([
            new Emt('div', 'class="kl_kiwi_top_menu"').addNode(website_grid)
        ]);


        website_grid.loadSourceArray(menu_map_top_btns).loadGridData2UI();

        website_grid.setIndexHandler(top.window.kl.kiwiJs.root_div, 'website_grid');

        let msg_box = new Emt('div', 'class="kl_kiwi_menu_root_msg_box hide"');
        let msg_text = new Emt('div', 'class="kl_kiwi_menu_root_msg_box_text"', '#');
        let msg_countdown = new Emt('div', 'class="kl_kiwi_menu_root_msg_box_countdown"', '#');


        msg_box.addNodes([
            msg_countdown,
            new Emt('div', 'class="kl_kiwi_menu_root_msg_box_text_outer"').addNodes([
                msg_text
            ])
        ]);

        let kiwi_show_msg_timer = addTimerTrigger({
            flag: 'kiwi_show_msg_timer', start: -1, interval: 10, ttl: 3, is_close: true,
            in_fun: function (trigger, counts) {
                //   trigger.close();
                //  msg_box.classList.add('hide');
                msg_countdown.textContent = Math.ceil((trigger.end - counts) / 10).toString() + 's';
            },
            out_fun: function () {
                msg_box.classList.add('hide');
            }
        });


        top.window.kl.kiwiJs.showMsg = function (msg, ttl) {
            msg_text.textContent = msg;
            msg_box.classList.remove('hide');
            if (typeof ttl === 'number' && ttl > 0) {
                kiwi_show_msg_timer.setNewTtl(0, ttl * 10);
            } else {
                kiwi_show_msg_timer.setNewTtl(0, 60 * 10);
            }

        };
        top.window.kl.kiwiJs.hideMsg = function (ttl) {
            if (typeof ttl === 'number' && ttl > 0) {
                kiwi_show_msg_timer.setNewTtl(0, ttl * 10);
            } else {
                msg_box.classList.add('hide');
                kiwi_show_msg_timer.closeFlag();
            }
        };


        if (typeof NoSleep === 'function') {
            let noSleep = new NoSleep();//在电视上也没用
            document.addEventListener('click', function enableNoSleep() {
                top.window.kl.log('NoSleep click ');
                document.removeEventListener('click', enableNoSleep, false);
                noSleep.enable();
            }, false);
        } else {
            top.window.kl.log('NoSleep load failed ', typeof NoSleep);
        }


        //防止息屏的代码

        let base64str = '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';

        //  kl.id('t').src = window.URL.createObjectURL(blob);
        let no_sleep_video = new Emt('video', 'loop="loop" controls="controls"', '', {src: 'data:video/mp4;base64,' + base64str});


        addTimerTrigger({
            flag: 'index_append',
            start: -1,
            interval: 5,
            ttl: 600,
            in_fun: function (trigger) {
                trigger.closeFlag();
                top.window.kl.log('in_fun');
                if (top && top.document && top.document.body) {
                    top.document.body.append(root_div);
                    document.body.addEventListener("keyup", function () {
                        no_sleep_video.play();
                    });
                    document.body.append(msg_box);


                    if (!top.document.getElementById('kl_kiwi_menu_style')) {
                        let w = window.innerWidth.toString();
                        let h = window.innerHeight.toString();
                        top.document.body.append(new Emt('style', 'id="kl_kiwi_menu_style"', '' +
                            '#kl_kiwi_menu_root{position: fixed; background: #EEE;width: 100%; height: ' + h + 'px; top: 0px; left: 0px; z-index: ' + top.window.kl.kiwiJs.config.css.root.zIndex + '; font-size: 20px;}' +
                            '#kl_kiwi_menu_root button{}' +
                            '.kl_kiwi_top_menu {position: fixed;width:100%;top:0px;width: 100%; background: #FFF;z-index:' + top.window.kl.kiwiJs.config.css.topMenu.zIndex + '}' +

                            '.big_btn_div button{font-size:20px;background:none;border:1px solid #CCC;margin:5px;padding:3px;}' +
                            '#kl_kiwi_menu_root button:focus{border:solid #000 1px;color:#FFF;background:#000;}' +
                            '.hide{display:none !important;}' +
                            '.keep_hide{display:none !important;}' +

                            '.kl_kiwi_menu_root_msg_box{position: fixed;width: 100%;height: 100%;top: 0;left: 0;z-index: ' + top.window.kl.kiwiJs.config.css.msg.zIndex + ';' +
                            'background: #666;\n' +
                            'background:rgb(66,66,66,0.8);\n' +
                            '    opacity: 1;\n' +
                            '}' +
                            '.kl_kiwi_menu_root_msg_box_text_outer{position: relative;width: 100%;height:100px;;margin: 0 auto;top: 50%;}' +
                            '.kl_kiwi_menu_root_msg_box_text{position: relative;width: 80%;margin: 0 auto;margin-top: -50px;left: 0;/*background: #FFF;*/ color: #FFF;font-size: 2em;font-weight: 900;}' +
                            '.kl_kiwi_menu_root_msg_box_countdown{font-size:2em;font-weight: 900;color: #FFF;padding:1em;}' +

                            ''));

                    }
                }
            },
            out_fun: function () {
                alert('fuck');
            }
        });


        return true;

    }

)();


        console.log('tampermonkey/_release/singly/music.163.com/src/content_provider.js');

        /********************************************************************************************************************************************************
 *  _  _ _  _  ___ _  ___        /| |    ---.       ___ ____ _  _
 *  |\/| |  | (__  | /            | |__. ___|      /    |  | |\/|
 *  |  | |_/| ___) | \__          | |__| ___|      \__  |__| |  |
 *
 * 非公用的业务逻辑 网易云页面逻辑处理部分
 *******************************************************************************************************************************************************/

(function () {

        if (top.window.kl.kiwiJs.captureInfo === undefined) {
            top.window.kl.kiwiJs.captureInfo = {
                music163: {
                    playlist: {isCompleted: false, songs: []},
                    lyric: false,
                    audioLink: false,
                    songFlag: 0,
                    loadLyric: function (text) {
                        top.window.kl.log('default_loadLyric', text);
                    },
                    loadAudio: function (link) {
                        top.window.kl.log('default_loadAudio', link);
                    },
                    timer: {
                        triggerMap: [],
                        triggers: [],
                        triggerFlagMap: {},
                    }


                },
            };
        } else {
            top.window.kl.log('网易云的已经初始化了，现在是iframe触发的，不用管了');
            return false;
        }
        if (top.window.kl === undefined) {
            throw 'top.window.kl not init';
        }


        addTimerTrigger({
            flag: 'music163jump',
            start: 10,
            interval: 5,
            ttl: 50,
            in_fun: function (trigger) {
                top.window.kl.log('in_fun');
                if (top && top.document && top.document.body) {
                    trigger.closeFlag();

                    /**
                     * 下面几个都是登录判断逻辑
                     */

                    if (document.location.href.indexOf('https://music.163.com/login') === 0 || document.location.href.indexOf('https://music.163.com/#/login') === 0) {
                        addTimerTrigger({
                            flag: 'waiting_log_iframe', start: 5, interval: 1, ttl: 150, is_close: false,
                            in_fun: function (trigger) {
                                let tmp_ifr = kl.id('g_iframe');
                                if (!tmp_ifr) {
                                    top.window.kl.log('g_iframe not ok');
                                    return false;
                                }
                                top.window.kl.kiwiJs.root_div.classList.add('hide');
                                let qrcode_text_eles = kl.xpathSearch('.//*[(contains(text(),"扫码登录"))]', tmp_ifr.contentDocment);
                                let agreement_checkboxs = kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]', tmp_ifr.contentDocment);
                                if (qrcode_text_eles.length === 0 && agreement_checkboxs.length === 0) {
                                    top.window.kl.log('g_iframe no elements');
                                    return false;
                                }
                                trigger.closeFlag();
                                if (qrcode_text_eles.length > 0) {
                                    top.window.kl.log('看样可以直接扫码');
                                } else {
                                    if (agreement_checkboxs.length === 1) {
                                        if (kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].checked === true) {
                                            kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].click();
                                        }
                                        kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].click();
                                        if (kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].parentElement.nextElementSibling && kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].parentElement.nextElementSibling.tagName === 'IMG') {
                                            kl.xpathSearch('.//input[@type="checkbox" and @id="j-official-terms"]')[0].parentElement.nextElementSibling.click();
                                        } else {
                                            alert('网易云 登录页面改版了，需要重新适配了:2');
                                        }
                                    } else {
                                        alert('网易云 登录页面改版了，需要重新适配了:1');
                                        return false;
                                    }
                                }

                            },
                            out_fun: function () {
                                alert('登录页面改版了，得重新适配');
                            }
                        });

                    }

                    if (document.location.href === 'https://music.163.com/#/' || document.location.href === 'https://music.163.com/#' || document.location.href === 'https://music.163.com/' || document.location.href === 'https://music.163.com') {
                        if (kl.xpathSearch('.//*[(contains(text(),"我的主页"))]').length === 0) {
                            if (kl.xpathSearch('.//a[@data-action="login"]').length === 0) {
                                top.window.kl.log('xxxxx', kl.xpathSearch('.//*[(contains(text(),"我的主页"))]'));
                                alert('网易云 首页改版了，需要重新适配了:1');
                            } else {
                                kl.xpathSearch('.//a[@data-action="login"]')[0].click();
                                document.location.href = 'https://music.163.com/#/login';
                            }
                        } else {
                            document.location.href = 'https://music.163.com/my/';
                        }
                    }

                    if (document.location.href === 'https://music.163.com/#/discover') {
                        //alert('我的音乐加载出来时，务必shi  桌面网站模式!!!');
                        document.location.href = 'https://music.163.com/my/';
                    }


                }
            },
            out_fun: function () {
                alert('fuck');
            }
        });


        /**
         * xhr 请求的结果会写到 storge 里面，这是添加数据处理的触发器
         */

        //   document.body.append(new Emt('iframe','id="ifr"','',{src:'https://music.163.com/#/my/m/music/playlist?id=40781021'}));
        top.window.kl.kiwiJs.captureXhrRecorder.addTrigger('weapi/v6/playlist/detail?csrf_token=', function (info) {
            top.window.kl.log("\n----------------------------------\ncaptureXhrRecorder playlist detail\n", info.text,);
            //key,url,text
            try {

                let playlist_info = JSON.parse(info.text);
                top.window.kl.kiwiJs.captureInfo.music163.playlist.songs = [];
                let tmp_j = 0;
                playlist_info.playlist.tracks.forEach(function (info, tmp_i) {
                    tmp_j = tmp_i + 1;
                    if (1 || info.copyright === 0) {
                        let singers = (info.ar || []).map(function (ele) {
                            return ele.name;
                        }).join('/');
                        top.window.kl.kiwiJs.captureInfo.music163.playlist.songs.push({
                            id: info.id,
                            title: info.name,
                            singers: singers,
                            text: info.name + "(" + singers + ")",
                            desc: info.al && info.al.name ? info.al.name : '',
                            pic: info.al && info.al.picUrl ? info.al.picUrl : '',
                            link: 'https://music.163.com/m/song?id=' + info.id,
                        });
                    }

                });
                if (tmp_j === playlist_info.playlist.tracks.length) {
                    top.window.kl.kiwiJs.captureInfo.music163.playlist.isCompleted = true;
                }
                top.window.kl.log('captureXhrRecorder playlist detail  top.window.kl.kiwiJs.captureInfo.music163.playlist', top.window.kl.kiwiJs.captureInfo.music163.playlist);
                info.close();

            } catch (e) {
                top.window.kl.kiwiJs.showMsg('列表搞不出来了' + e.message);
                top.window.kl.log('captureXhrRecorder playlist/detail   列表搞不出来了', info);
            }
        });


        top.window.kl.kiwiJs.captureXhrRecorder.addTrigger('weapi/song/lyric?csrf_token', function (info) {
            //key,url,text
            try {
                top.window.kl.log("\n----------------------------------\ncaptureXhrRecorder lyirc_info\n", info.url,);
                let lyrc_info = JSON.parse(info.text);
                top.window.kl.kiwiJs.captureInfo.music163.lyric = lyrc_info.lrc.lyric;
                top.window.kl.log('captureXhrRecorder lyirc_info', lyrc_info, lyrc_info.lrc.lyric);
                top.window.kl.kiwiJs.captureInfo.music163.loadLyric(lyrc_info.lrc.lyric);
            } catch (e) {
                top.window.kl.kiwiJs.showMsg('歌词搞不出来了' + e.message);
                top.window.kl.log('captureXhrRecorder lyirc_info 歌词搞不出来了', info);
            }
        });

        top.window.kl.kiwiJs.captureXhrRecorder.addTrigger('weapi/song/enhance/player/url/v1?csrf_token', function (info) {
            //key,url,text
            try {
                top.window.kl.log("\n----------------------------------\ncaptureXhrRecorder audio_link_info\n", info.url,);
                let audio_info = JSON.parse(info.text);
                top.window.kl.kiwiJs.captureInfo.music163.audioLink = audio_info.data[0].url;
                top.window.kl.log('captureXhrRecorder audio_link_info', audio_info, audio_info.data[0].url);
                top.window.kl.kiwiJs.captureInfo.music163.loadAudio(audio_info.data[0].url);
            } catch (e) {
                top.window.kl.kiwiJs.showMsg('音乐播放链接搞不出来了' + e.message);
                top.window.kl.log('captureXhrRecorder audio_link_info 音乐播放链接搞不出来了', info);

            }
        });


        /**
         * 网易云音乐的业务js 已经接受了 xhr record 清理工作，告诉默认的清理程序可以歇歇了
         */
        shutdowDefaultXhrStorageCleaner('music.164.com.js instead');


        /**
         * 一个简答的歌词 播放器
         * @param lyric_str
         * @return lyricPlayer
         */
        let lyricPlayer = function (lyric_str) {
            let self = new Emt('div', 'class="kl_kiwi_js_lyric_player"');
            self._config = {
                lastStrIndex: 0,
                timePos: [],
                timePMap: {},
                timeLastInfo: {arrayIndex: 0, sec: 0},
                height: 0,
                top: 0,
                pHeight: 0,
                init: false,
                scrollLock: true,
                durationSec: 0,
                lyricTypeIsStandard: false,
                allPTotal: 0,
                diffHeight: 0,
                diffPHeight: 0,
            };
            self.config = self._config;

            self.setDuration = function (sec) {
                if (self.config.durationSec === 0) {
                    self.config.durationSec = sec;
                }
            };

            self.loadLyric = function (lyric_str) {
                self.innerHTML = '';
                self.config = self._config;
                self.style.marginTop = '0px';
                let tmp_strs = lyric_str.split("\n");
                let errors = [];

                let p1 = new Emt('p', '');
                let no_std_ps = [];
                let std_ps_cnt = 0;
                let error_std_ps = [];
                self.addNode(p1);
                tmp_strs.forEach(function (tmp_str) {
                    if (tmp_str.indexOf('[') === 0) {
                        let tmp_nums = tmp_str.substr(1, 5).split(':');
                        if (tmp_nums.length === 2) {
                            let num1 = parseInt(tmp_nums[0]);
                            let num2 = parseInt(tmp_nums[1]);
                            if (!(isNaN(num1) || isNaN(num2))) {
                                let sec = num1 * 60 + num2;
                                let p = new Emt('p', 'flag="' + self.config.timePos.length + '" sec="' + sec + '"', tmp_str);
                                self.config.timePos.push(sec);
                                self.config.timePMap['p' + sec] = p;
                                std_ps_cnt = std_ps_cnt + 1;
                                self.addNode(p);
                            } else {
                                //errors.push('开头isNaN:' + tmp_str);
                                let p = new Emt('p', '', tmp_str + '');
                                error_std_ps.push(p);
                                self.addNode(p);
                            }

                        } else {
                            let p = new Emt('p', '', tmp_str + '');
                            error_std_ps.push(p);
                            self.addNode(p);
                            //errors.push('开头多个[:]:' + tmp_str);
                        }
                    } else {
                        let p = new Emt('p', '', tmp_str + '');
                        no_std_ps.push(p);
                        self.addNode(p);
                        //errors.push('开头不能识别:' + tmp_str);
                    }
                });
                let unique = function (arr) {
                    return Array.from(new Set(arr)); // 利用Array.from将Set结构转换成数组 Set数据结构，它类似于数组，其成员的值都是唯一的
                };
                self.config.timePos = unique(self.config.timePos).sort(function (a, b) {
                    return a - b;
                });//push速度过快，导致顺序混乱，默认排序又不按数字来
                if (self.config.timePos.length > 9) {
                    self.config.timeLastInfo.sec = self.config.timePos[0];
                }
                self.allPTotal = std_ps_cnt + no_std_ps.length + error_std_ps.length;
                // top.window.kl.log('xxxxx', std_ps_cnt, no_std_ps.length, error_std_ps.length);
                if ((std_ps_cnt / self.allPTotal) > 0.7) {
                    self.config.lyricTypeIsStandard = true;//超过70%，就捏着鼻子认了
                }

                p1.textContent = errors.join('//');
                self.catchLyricBoxSizeTimer.setNewTtl(3, -1, function (trigger) {
                    trigger.closeFlag();
                    self.config.height = self.scrollHeight;
                    self.config.diffHeight = self.scrollHeight - self.parentElement.offsetHeight + 150;
                    self.config.diffPHeight = Math.round(self.config.diffHeight / (self.allPTotal + 1));
                    //self.config.top = self.scroll.top;
                    self.config.pHeight = Math.round(self.config.height / (self.allPTotal + 1));
                    top.window.kl.log('scroll2sec init', self.config, self.scrollHeight, self.parentElement.offsetHeight, self.allPTotal);
                    top.window.kl.log('scroll2sec height error', self.config.height);
                    self.config.init = true;
                    self.config.scrollLock = false;
                    top.window.kl.log('catch_lyric_box_size_timer', self.scrollHeight, self.parentElement.offsetHeight, self.config);

                });
                return self;
            };

            self.scroll2sec = function (input_sec) {
                if (self.config.init === false) {
                    //top.window.kl.log('scroll2sec self.config.init===false');
                    return false;
                }
                if (self.config.scrollLock === true) {
                    //top.window.kl.log('scroll2sec self.config.scrollLock===true');
                    return false;
                }
                self.config.scrollLock = true;
                if (self.config.lyricTypeIsStandard === false) {
                    return self.scrollByRatio(input_sec);
                }

                let new_last_array_index = self.config.timeLastInfo.arrayIndex;
                let new_sec = 0;
                let tmp_start = 0;
                let tmp_end = self.config.timePos.length;
                if (self.config.timeLastInfo.sec < input_sec) {
                    tmp_start = self.config.timeLastInfo.arrayIndex;
                } else {
                    tmp_end = self.config.timeLastInfo.arrayIndex;
                }

                for (let tmp_i = tmp_start; tmp_i < tmp_end; tmp_i++) {
                    //top.window.kl.log('scroll2sec ', 'i:', tmp_i, 'new_index:', new_last_array_index, 'time:', self.config.timePos[tmp_i], 'res:', sec < self.config.timePos[tmp_i]);
                    if (input_sec < self.config.timePos[tmp_i]) {
                        break;
                    }
                    new_last_array_index = tmp_i;
                    new_sec = self.config.timePos[tmp_i];
                }
                //  top.window.kl.log('scroll2sec ', 'input:', input_sec, 'start:', tmp_start, 'end:', tmp_end, 'cuurent:', self.config.timeLastInfo, 'new_index:', new_last_array_index,'new_sec:', new_sec);

                if (new_last_array_index !== self.config.timeLastInfo.arrayIndex) {
                    self.config.timePMap['p' + self.config.timePos[new_last_array_index]].classList.add('lyric_str_selected');
                    self.config.timePMap['p' + self.config.timeLastInfo.sec].classList.remove('lyric_str_selected');
                    // top.window.kl.log('scroll2sec new posi', 'input:', input_sec, 'current :', self.config.timeLastInfo, 'to:', {sec: new_sec,arrayIndex: new_last_array_index                    });
                    self.config.timeLastInfo.sec = new_sec;
                    self.config.timeLastInfo.arrayIndex = new_last_array_index;
                }
                if (self.config.timeLastInfo.arrayIndex > 6) {
                    //top.window.kl.log('scroll2sec',self.config.timeLastInfo.arrayIndex - 6,self.config.pHeight,-(self.config.timeLastInfo.arrayIndex - 6) * self.config.pHeight);
                    self.style.marginTop = (-(self.config.timeLastInfo.arrayIndex - 6) * self.config.pHeight) + 'px';
                } else {
                    self.style.marginTop = '0px';
                }
                self.config.scrollLock = false;

            };
            /**
             * 没有时间点的歌词，直接按比例滚动，不管对错了
             * @param input_sec
             */
            self.scrollByRatio = function (input_sec) {
                self.config.scrollLock = true;
                if (self.config.durationSec > 0) {
                    self.style.marginTop = (-Math.round(input_sec * self.config.diffHeight / self.config.durationSec)) + 'px';
                } else {
                    self.style.marginTop = '0px';
                }
                self.config.scrollLock = false;
            };

            top.window.kl.log('addTimerTrigger', addTimerTrigger);
            self.catchLyricBoxSizeTimer = isTimerTriggerExist('catch_lyric_box_size_timer') ?
                getTimerTrigger('catch_lyric_box_size_timer') :
                addTimerTrigger({
                    flag: 'catch_lyric_box_size_timer', start: -1, interval: 1, ttl: 3, is_close: true,
                    in_fun: function (trigger) {

                    },
                    out_fun: function () {
                    }
                });

            return self;
        };

        if (document.location.href.indexOf('music/playlist?id=') > 0) {
            top.window.kl.log('playlist 页面逻辑 start');
            let songs_list_ifr = kl.id('g_iframe');
            if (songs_list_ifr === undefined) {
                alert('网易云改版了');
                return false;
            }

            let play_btn_click_timer = addTimerTrigger({
                flag: 'play_btn_click_timer', start: -1, interval: 1, ttl: 3, is_close: true,
                in_fun: function (trigger) {
                    trigger.closeFlag();
                    top.window.kl.log('play_btn_click_timer');
                },
                out_fun: function () {
                }
            });
            let catch_comment_timer = addTimerTrigger({
                flag: 'catch_comment_timer', start: -1, interval: 5, ttl: -1, is_close: true,
                in_fun: function (trigger) {
                    trigger.closeFlag();
                    top.window.kl.log('catch_comment_timer');
                },
                out_fun: function () {
                }
            });

            let playinfo_text = new Emt('button', 'class="kl_kiwi_playinfo"', '#');
            let audio_div = new Emt('div', 'class="kl_kiwi_audio"');
            let switch_div = new Emt('div', 'class="kl_kiwi_switch"');
            let song_list_div = new Emt('div', 'class="kl_kiwi_song_list"');
            let comment_div = new Emt('div', 'class="kl_kiwi_comment hide"');

            let lyric_div = new Emt('div', 'class="kl_kiwi_lyric hide"');

            //   if (document.location.href.indexOf('https://y.music.163.com/m/playlist?id=') === 0) {
            let audio_ele = new Emt('audio', 'autoplay="autoplay" controls="controls" class="hide2"');//播放音乐的element

            let lyric_div2 = new Emt('div', 'style="height:100%;overflow:hidden;margin-top:1em;"');


            let songs_div = new Emt('div', ' class="kl_kiwi_list_box" ');//歌曲列表的root div
            let song_ifr = new Emt('iframe', ' class="kl_kiwi_song_iframe" test="test"', '', {scrollCount: 0, loadedHeight: 0});
            audio_div.songId = 0;
            let songs_grid = (new HammerTvGrid()).setUIColsNumber(3).setUIRowsNumber(7);//歌曲列表的 网格
            let switch_grid = (new HammerTvGrid()).setUIColsNumber(3).setUIRowsNumber(1).setPros({className: 'hide2'});//用于上一首 下一首 循环模式的  换曲网格
            let audio_grid = (new HammerTvGrid()).setUIColsNumber(1).setUIRowsNumber(1);//audio element 的网格 ，左右快进，下隐藏  audio_div

            let comment_grid = (new HammerTvGrid()).setUIColsNumber(1).setUIRowsNumber(1).setScrollDataDirection('x');//评论网格

            top.window.kl.kiwiJs.captureInfo.music163.player = audio_ele;


            top.window.kl.kiwiJs.root_div.addNodes([
                audio_div.addNodes([
                    switch_div.addNodes([
                        switch_grid,
                        playinfo_text
                    ]),


                    audio_grid,
                ]),
                song_list_div.addNode(
                    songs_grid
                ),
                lyric_div.addNodes([(new lyricPlayer()).setIndexHandler(lyric_div, 'player')]),
                comment_div.addNode(
                    comment_grid
                )
            ]);


            audio_grid.setPros({className: 'kl_kiwi_audio_grid'}).loadSourceArray([{
                text: '', tagName: 'button', type: 'fun', fun: function () {
                    //检测播放是否已暂停.audio.paused 在播放器播放时返回false.
                    if (audio_ele.paused) {
                        audio_ele.realPlay();//audio.play();// 这个就是播放
                    } else {
                        audio_ele.pause();// 这个就是暂停
                    }
                }
            }]).loadGridData2UI();
            audio_grid.drawUIGrid().uiGrid[0][0].gridCellElement.addNodes([
                audio_ele

            ]);


            // songs_grid.bindGrid('top', top.window.kl.kiwiJs.root_div.website_grid);
            songs_grid.setIndexHandler(top.window.kl.kiwiJs.root_div, 'songs_grid',);
            switch_grid.setIndexHandler(top.window.kl.kiwiJs.root_div, 'switch_grid',);

            top.window.kl.kiwiJs.root_div.website_grid.bindDirectionFunction('down', function () {
                top.window.kl.kiwiJs.root_div.website_grid.classList.add('hide');
                songs_grid.focusUILastGridCell('website_grid');
            });//导航网格  向下超出时， 隐藏 自己，展示 歌曲列表 网格
            songs_grid.bindDirectionFunction('top', function () {
                top.window.kl.kiwiJs.root_div.website_grid.classList.remove('hide');
                top.window.kl.kiwiJs.root_div.website_grid.focusUILastGridCell('songs_grid');
            });//歌曲列表网格  向上超出时， 隐藏 自己，展示 导航网格

            if (0) {
                songs_grid.bindDirectionFunction('down', function () {
                    audio_div.classList.remove('hide');
                    switch_grid.focusUILastGridCell('songs_grid');
                });//歌曲列表网格  向下超出时， 隐藏 自己，展示 播放界面
            }


            // switch_grid.bindGrid('down', audio_grid);

            switch_grid.bindDirectionFunction('down', function () {
                audio_grid.focusUILastGridCell('switch_grid');
            });//换曲控制网格  向下超出时， 隐藏 自己，焦点进入  audio element 网格

            audio_grid.bindDirectionFunction('top', function () {
                switch_grid.focusUILastGridCell('audio_grid');
            });//audio element 网格  向上超出时， 隐藏 自己，展示并进入换曲控制网格

            audio_grid.bindDirectionFunction('left', function () {
                //快退
                audio_ele.currentTime = audio_ele.currentTime - 15;
            });
            audio_grid.bindDirectionFunction('right', function () {
                //快进
                audio_ele.currentTime = audio_ele.currentTime + 15;
            });

            audio_grid.bindDirectionFunction('down', function () {
                lyric_div.classList.add('hide');
                comment_div.classList.add('hide');
                songs_grid.focusUILastGridCell('songs_grid');
            });//audio element 网格  向下超出时， 隐藏播放界面，展示歌曲列表网格


            switch_grid.bindDirectionFunction('top', function () {
                if (comment_grid.dataGrid.length > 0) {
                    comment_div.classList.remove('hide');
                    comment_grid.focusUILastGridCell('switch_grid');
                } else {
                    top.window.kl.kiwiJs.showMsg('正在获取评论中……', 2);
                }

            });//switch element 网格  向上超出时， 显示评论

            comment_grid.bindDirectionFunction('down', function () {
                comment_div.classList.add('hide');
                switch_grid.focusUILastGridCell('comment_grid');
            });//comment 网格  向下超出时， 显示播放界面

            comment_grid.bindDirectionFunction('left', function () {
                //t.contentDocument.body.scrollHeight
                if (song_ifr.loadedHeight === 0) {
                    song_ifr.loadedHeight = parseInt(song_ifr.scrollHeight * 0.9);
                }
                top.window.kl.log(song_ifr.loadedHeight, song_ifr.scrollHeight);

                if (song_ifr.loadedHeight > 0) {
                    let tmp_comment_div = song_ifr.contentDocument.getElementById('comment-box');
                    top.window.kl.log(song_ifr, song_ifr.offsetHeight, song_ifr.scrollHeight, tmp_comment_div.scrollHeight);
                    if (song_ifr.scrollCount <= 0) {
                        top.window.kl.log('应该翻页了<');
                        let tmp_as = kl.xpathSearch('.//a[text()="上一页" and not (contains(@class,"js-disabled"))]', song_ifr.contentDocument);
                        if (tmp_as.length) {
                            tmp_as[0].click();
                            tmp_comment_div.style.marginTop = '0px';
                            song_ifr.scrollCount = 0;
                        }
                    } else {
                        song_ifr.scrollCount = song_ifr.scrollCount - 1;
                        tmp_comment_div.style.marginTop = -(song_ifr.scrollCount * song_ifr.loadedHeight) + 'px';

                    }
                }

            });//comment 网格  向上滚动和翻页

            comment_grid.bindDirectionFunction('right', function () {
                if (song_ifr.loadedHeight === 0) {
                    song_ifr.loadedHeight = parseInt(song_ifr.scrollHeight * 0.9);
                }
                top.window.kl.log(song_ifr.loadedHeight, song_ifr.scrollHeight);
                if (song_ifr.loadedHeight > 0) {
                    let tmp_num = (song_ifr.scrollCount + 1) * song_ifr.loadedHeight;
                    let tmp_comment_div = song_ifr.contentDocument.getElementById('comment-box');
                    top.window.kl.log(song_ifr, song_ifr.offsetHeight, song_ifr.scrollHeight, tmp_comment_div.scrollHeight);
                    if (tmp_num < tmp_comment_div.scrollHeight) {
                        tmp_comment_div.style.marginTop = -tmp_num + 'px';
                        song_ifr.scrollCount = song_ifr.scrollCount + 1;
                    } else {
                        top.window.kl.log('应该翻页了>');
                        let tmp_as = kl.xpathSearch('.//a[text()="下一页" and not (contains(@class,"js-disabled"))]', song_ifr.contentDocument);
                        if (tmp_as.length) {
                            tmp_as[0].click();
                            tmp_comment_div.style.marginTop = '0px';
                            song_ifr.scrollCount = 0;
                        }
                    }
                }

            });//comment 网格  向下滚动和翻页


            switch_grid.loopType = 'list';

            switch_grid.preSong = function () {
                lyric_div.classList.add('hide');
                comment_div.classList.add('hide');
                songs_grid.focusPreUIGridCell();
                top.window.kl.kiwiJs.golobInfo.lastUIGridCell.focusSelf();
                document.activeElement.play();
            };
            switch_grid.nextSong = function () {
                lyric_div.classList.add('hide');
                comment_div.classList.add('hide');
                songs_grid.focusNextUIGridCell();
                top.window.kl.kiwiJs.golobInfo.lastUIGridCell.focusSelf();
                document.activeElement.play();
            };
            switch_grid.changeLoop = function (input_ele) {
                let tmp_map = {single: {next: 'list', text: '循环-列表'}, list: {next: 'single', text: '循环-单曲'}};
                let new_info = tmp_map[switch_grid.loopType];
                switch_grid.loopType = new_info.next;
                input_ele.textContent = '当前' + new_info.text;
            };


            let flush_lyric_timer = addTimerTrigger({
                flag: 'flush_lyric_timer', start: -1, interval: 10, ttl: -1, is_close: false,
                in_fun: function (trigger) {
                    //top.window.kl.log('xxxxxx', kl.xpathSearch('.//table[contains(@class,"m-table")]//span[@data-res-action="play"]', document.getElementById('g_iframe').contentDocument).length);
                    if (audio_ele.paused) {
                        return false;
                    }
                    if (lyric_div.player) {
                        lyric_div.player.scroll2sec(Math.ceil(audio_ele.currentTime));
                    }
                },
                out_fun: function () {
                }
            });


            audio_div.resetSongInfo = function () {
                top.window.kl.kiwiJs.captureInfo.music163.lyric = false;
                top.window.kl.kiwiJs.captureInfo.music163.audioLink = false;
                if (lyric_div.player) {
                    lyric_div.player.remove();
                }
                lyric_div.addNodes([(new lyricPlayer()).setIndexHandler(lyric_div, 'player')]);
                // audio_ele.currentTime=0;
            };

            audio_ele.addEventListener("canplay", function () {   //当浏览器能够开始播放指定的音频/视频时，发生 canplay 事件。
                //Math.ceil(audio_ele.duration)
                top.window.kl.log('canplay', audio_ele, audio_ele.duration);
                lyric_div.player.setDuration(Math.ceil(audio_ele.duration));
                audio_ele.realPlay();
            });

            audio_ele.addEventListener("ended", function () {   //首歌曲播放完之后。
                if (switch_grid.loopType === 'single') {
                    audio_ele.currentTime = 0;
                    audio_ele.realPlay();
                } else if (switch_grid.loopType === 'list') {
                    switch_grid.nextSong();
                } else {
                    top.window.kl.log('暂不支持 switch_grid.loopType:', switch_grid.loopType);
                }
            });

            comment_grid.loadSourceArray([{
                // tagName: 'div',
                attrStr: 'class="comment_div"',
                // tabIndex: 999,
                appendElement: song_ifr,
                text: '', type: 'fun', fun: function (cell_emt) {
                    top.window.kl.log('cell_emt_init_data', cell_emt.init_data);
                }
            }]).loadGridData2UI(false);


            catch_comment_timer.setNewTtl(-1, -1, function (trigger) {
                let cs = kl.xpathSearch('.//div[@class="m-cmmt"]//div[@class="itm"]', song_ifr.contentDocument);
                if (cs.length > 0) {
                    trigger.closeFlag();
                    (['.//div[@class="m-lycifo"]', './/div[@id="g_top"]', './/div[@id="g_nav"]', './/div[@class="iptarea"]', './/div[contains(@class,"u-title")]']).map(function (tmp_str) {
                        kl.xpathSearch(tmp_str, song_ifr.contentDocument).map(function (tmp_ele) {
                            tmp_ele.style.display = 'none';
                        });
                    });

//t=$x('.//a[contains(@class,"js-selected")]')[0]
                    top.window.kl.log('song_ifr.loadedHeight', song_ifr.loadedHeight, song_ifr.scrollHeight);

                }
            });
            song_ifr.addEventListener('load', function () {
                catch_comment_timer.openFlag();
            });
            songs_div.loadNewLyric = function (lyric) {
                lyric_div.player.loadLyric(lyric);
            };
            songs_div.loadNewSongSrc = function (audio_link) {
                audio_ele.src = audio_link;
                top.window.kl.kiwiJs.showMsg('加载完毕', 1);
                audio_ele.realPlay();
                playinfo_text.textContent = audio_div.sourceBtn.init_data.text;
            };

            //captureSongInfoInIframe 逻辑


            let linsten_lyric_timer = addTimerTrigger({
                flag: 'linsten_lyric_timer', start: -1, interval: 1, ttl: -1, is_close: true,
                in_fun: function (trigger) {
                    top.window.kl.log('linsten_lyric_timer');
                    if (top.window.kl.kiwiJs.captureInfo.music163.lyric !== false) {
                        trigger.closeFlag();
                        top.window.kl.log('listen_songinfo_lyric');
                        songs_div.loadNewLyric(top.window.kl.kiwiJs.captureInfo.music163.lyric);
                        top.window.kl.kiwiJs.captureInfo.music163.lyric = false;
                    }
                },
                out_fun: function () {
                }
            });

            let linsten_audio_link_timer = addTimerTrigger({
                flag: 'linsten_audio_link_timer', start: -1, interval: 1, ttl: -1, is_close: true,
                in_fun: function (trigger) {
                    top.window.kl.log('linsten_audio_link_timer');
                    if (top.window.kl.kiwiJs.captureInfo.music163.audioLink !== false) {
                        trigger.closeFlag();
                        top.window.kl.log('listen_songinfo_audio_link');
                        songs_div.loadNewSongSrc(top.window.kl.kiwiJs.captureInfo.music163.audioLink);
                        top.window.kl.kiwiJs.captureInfo.music163.audioLink = false;
                    }
                },
                out_fun: function () {
                }
            });


            switch_grid.waitingCaptureSongInfo = function (raw_btn, cell_emt) {
                top.window.kl.log('waitingCaptureSongInfo', cell_emt, cell_emt.init_data);
                if (audio_div.songId === cell_emt.init_data.songId) {
                    lyric_div.classList.remove('hide');
                    comment_div.classList.add('hide');
                    audio_grid.focusUILastGridCell('songs_grid');
                    return false;
                }
                audio_div.songId = cell_emt.init_data.songId;
                lyric_div.classList.remove('hide');
                comment_div.classList.add('hide');
                song_ifr.src = cell_emt.init_data.link;

                audio_grid.focusUILastGridCell('init');

                audio_div.resetSongInfo();
                linsten_lyric_timer.openFlag();
                linsten_audio_link_timer.setNewTtl(0, 70, false, function () {
                    top.window.kl.kiwiJs.showMsg('加载不到' + cell_emt.init_data.text + '信息,进入下一个', 2);
                    switch_grid.nextSong();
                });

                top.window.kl.kiwiJs.captureXhrRecorder.keepScan();
                top.window.kl.kiwiJs.captureXhrRecorder.cleanXhrRecord(false);//全都清理掉，不管了
                top.window.kl.kiwiJs.showMsg('正在加载歌曲信息->' + cell_emt.init_data.text, 7);
                //  console.clear();
                top.window.kl.log('清理 captureSongInfoInIframe lyric & audio_link clean');
                audio_div.sourceBtn = cell_emt;


                play_btn_click_timer.setNewTtl(3, 0, function (trigger) {
                    trigger.closeFlag();
                    raw_btn.click();
                });             //因为 keepRecordXhr 在设置后，不能立马生效，所以延迟下，后期考虑把循环事件设置小一些
            };

            let player_btns = [
                {text: '上一首', handleKey: 'home', type: 'fun', fun: switch_grid.preSong},
                {text: '下一首', handleKey: 'pre', type: 'fun', fun: switch_grid.nextSong},
                {
                    text: '循环-列表', handleKey: 'pre', type: 'fun', fun: function (ele) {
                        switch_grid.changeLoop(ele);
                    }
                },
            ];
            switch_grid.loadSourceArray(player_btns).loadGridData2UI();
            top.window.kl.kiwiJs.showMsg('正在加载歌曲列表', 60);


            keepRecordXhr();
            top.window.kl.kiwiJs.captureXhrRecorder.keepScan();
            top.window.kl.kiwiJs.captureXhrRecorder.cleanXhrRecord(false);//全都清理掉，不管了


            let songs_list_timer = addTimerTrigger({
                flag: 'songs_list_timer',
                start: -1,
                interval: 10,
                ttl: 600,
                in_fun: function (trigger) {
                    trigger.closeFlag();
                    top.window.kl.log('top.window.kl.kiwiJs.captureInfo.music163.playlist.isCompleted', top.window.kl.kiwiJs.captureInfo.music163.playlist.isCompleted);
                    if (top.window.kl.kiwiJs.captureInfo.music163.playlist.isCompleted === false) {
                        top.window.kl.log('playlist_completed_not_yet 音乐列表还没完成');
                        return false;
                    } else {
                        top.window.kl.log('playlist_completed_yes 音乐列表好了');
                    }
                    // kl.xpathSearch('.//div[@class="pylst_list"]')[0].remove();
                    let song_btns = [];
                    top.window.kl.kiwiJs.captureInfo.music163.playlist.songs.forEach(function (info, info_index) {
                        if (1 || info_index < 100) {
                            song_btns.push({
                                title: info.title,
                                songId: info.id,
                                text: info_index + '/' + info.text + "\n" + info.desc, link: info.link, type: 'fun', fun: function (cell_emt) {
                                    top.window.kl.log('cell_emt_init_data', cell_emt.init_data);
                                    let play_btns = kl.xpathSearch('.//span[@data-res-action="play" and @data-res-id="' + info.id + '"]', document.getElementById('g_iframe').contentDocument);
                                    top.window.kl.log(play_btns, './/span[@data-res-action="play" and @data-res-id="' + info.id + '"]');
                                    if (kl.xpathSearch('.//table[contains(@class,"m-table")]//span[@data-res-action="play"]', document.getElementById('g_iframe').contentDocument).length < top.window.kl.kiwiJs.captureInfo.music163.playlist.songs.length) {
                                        alert('还没加载完毕');
                                        return false;
                                    }
                                    if (play_btns.length === 1) {
                                        top.window.kl.kiwiJs.captureInfo.music163.songFlag = info.id;
                                        switch_grid.waitingCaptureSongInfo(play_btns[0], cell_emt);
                                    } else {
                                        switch_grid.nextSong();
                                    }
                                }
                            });
                        }
                    });
                    songs_grid.loadSourceArray(song_btns).loadGridData2UI();
                    top.window.kl.kiwiJs.showMsg('歌曲加载完毕.共' + song_btns.length + '首,向下进入歌曲列表', 2);
                    top.window.kl.log('songs_grid.dataGrid', songs_grid.dataGrid);
                    // songs_table.selectCell(0, 0, 'init');
                    top.window.kl.kiwiJs.root_div.website_grid.focusUILastGridCell('next_grid');
                },
                out_fun: function () {
                    alert('fuck');
                }
            });


            addTimerTrigger({
                flag: 'css',
                start: -1,
                interval: 10,
                ttl: 600,
                in_fun: function (trigger) {
                    trigger.closeFlag();
                    if (window.innerHeight > 0) {
                        top.window.kl.log('window.innerHeight', window.innerHeight, 'window.innerWidth', window.innerWidth);
                        let song_avg_w = (100 / songs_grid.config.ui.cols).toFixed(2);
                        let song_avg_h = (95 / songs_grid.config.ui.rows).toFixed(2);

                        // let song_avg_w = Math.floor(window.innerWidth / songs_grid.config.ui.cols);
                        //  let song_avg_h = Math.floor(window.innerHeight / (songs_grid.config.ui.rows + 0.5));


                        top.window.kl.log();
//' + top.window.kl.kiwiJs.config.css.root.zIndex + '
                        top.document.body.append(new Emt('style', 'id="kl_kiwi_menu_style_website"', '' +
                            '.kl_kiwi_song_list {position: fixed; left: 0; top: 0;width: 100%;height: 90%;background: #EEE;z-index:' + top.window.kl.kiwiJs.config.css.songList.zIndex + '}' +
                            '.kl_kiwi_song_switch {position: fixed; left: 0; top: 0;width: 100%;height: 90%; background: #DDD;z-index:' + top.window.kl.kiwiJs.config.css.switch.zIndex + '}' +
                            '.kl_kiwi_comment {position: fixed; left: 0; top: 0;width: 100%;height: 95%; background: #DDD;z-index:' + top.window.kl.kiwiJs.config.css.comment.zIndex + '}' +
                            '.kl_kiwi_audio {position: fixed;width:100%;bottom:0px;width: 100%; background: #FFF;z-index:' + top.window.kl.kiwiJs.config.css.audio.zIndex + '}' +
                            '.kl_kiwi_lyric {position: fixed; left: 0; top: 0;padding:1em;width: 100%;height: 95%; background: #DDD;z-index:' + top.window.kl.kiwiJs.config.css.lyric.zIndex + '}' +
                            '.kl_kiwi_switch{display:block;float:left;}' +
                            '.kl_kiwi_playinfo{display:block;float:left;border:none !important;}' +


                            '.kl_kiwi_song_list>table ,.kl_kiwi_song_list>table tbody{display:block; float:left;width:100%;height:100%; }' +
                            '.kl_kiwi_song_list>table tr{display:block; width:100%;height:' + song_avg_h + '%; }' +
                            '.kl_kiwi_song_list>table tr td{display:block;float:left; width:' + song_avg_w + '%;height:100%; }' +
                            '.kl_kiwi_song_list>table tr td>button{display:block; width:90%;height:90%;padding:3px;margin:0px;    text-align: left;font-size:14px;border: 1px solid #AAA; }' +
                            '.kl_kiwi_song_list>table tr td>button:fcous{  background:#000;color:#F00;border: 1px solid #FFF; }' +


                            '.kl_kiwi_comment>*,.kl_kiwi_comment>*>*,.kl_kiwi_comment>*>*>*,.kl_kiwi_comment>*>*>*>* {display:block;float:left;width:100%;height:100%;}' +
                            '.kl_kiwi_comment>*,.kl_kiwi_comment>*>*,.kl_kiwi_comment>*>*>*,.kl_kiwi_comment>*>*>*>* {display:block;float:left;width:100%;height:100%;}' +
                            '.comment_div{width:100%;height:100%;border:2px solid #000;font-size:14px;}' +
                            '.comment_div:fcous{border:2px solid #F00;}' +
                            '.comment_list_div>.itm{border:1px solid #AAA;}' +


                            '.kl_kiwi_audio_grid button{display:block !important;float:left !important;width:98% !important;background:#FFF !important;border:3px solid #FFF !important;color:#000 !important;margin-left:1% !important;}' +
                            '.kl_kiwi_audio_grid button:focus{border:solid #000 3px !important;background:#FFF !important;color:#000 !important;}' +
                            '.kl_kiwi_audio_grid{display:block;float:left;width:100%;}' +
                            '.kl_kiwi_audio_grid,.kl_kiwi_audio_grid>*,.kl_kiwi_audio_grid tr,.kl_kiwi_audio_grid td,.kl_kiwi_audio_grid button{display:block;float:left;width:100%;}' +
                            '.kl_kiwi_audio_grid audio{display:block;float:left;width:100%;height:0.6em;}' +


                            '.kl_kiwi_js_lyric_player{height:auto%;}' +
                            '.lyric_str_selected{font-weight:900;}' +
                            '.a:focus:{display:block;float:left;border:1em solid #F00;}' +


                            '.kl_kiwi_menu_root table,.kl_kiwi_menu_root tbody,.kl_kiwi_menu_root tr{display:block;float:left;width:100%}' +


                            '.kl_kiwi_song_iframe{display: block !important;width: 100% !important;height: 100%;}' +

                            '.kl_kiwi_switch{display:block;float:left;height: auto;width:100%;background: linear-gradient(to bottom, transparent, #EEE);color: transparent;}' +
                            '.kl_kiwi_switch table{width:auto;}' +
                            '.kl_kiwi_switch button{width:auto;font-size:14px;}' +


                            ''));
                        top.window.kl.log('css_ok');

                    }
                },
                out_fun: function () {
                    alert('fuck');
                }
            });


            window.addEventListener('1beforeunload', (event) => {
                // Cancel the event as stated by the standard.
                event.preventDefault();
                // Chrome requires returnValue to be set.
                event.returnValue = 'xxxx ';
            });


        }
    }


)();


    } catch (e) {
        alert('出错了，刷新试试，如果刷新后还不行，那就洗洗睡吧');
        throw e;
    }


})();