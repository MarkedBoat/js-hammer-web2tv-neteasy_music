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



