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