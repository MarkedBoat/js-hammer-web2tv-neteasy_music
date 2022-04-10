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
