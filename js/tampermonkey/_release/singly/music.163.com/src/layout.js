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
