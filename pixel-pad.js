var ToolName;
(function (ToolName) {
    ToolName["eraser"] = "eraser";
    ToolName["pen"] = "pen";
})(ToolName || (ToolName = {}));
export default class PixelPad {
    constructor(htmlNode, option) {
        this.optionDefault = {
            bgColor: '#e8e8e8',
            drawColor: '#00a711',
            boxSize: 8,
            boxSizeMin: 8,
            boxSizeMax: 20,
            gridLineWidth: 1,
            bgBoxNumX: 0,
            bgBoxNumY: 0,
        };
        this.preDrawBoxPoint = null;
        this.isDrawing = false;
        this.drawInfoHistory = [];
        this.drawInfoHistoryFull = [];
        this.drawInfoHistoryForRedo = [];
        this.drawInfoHistoryFullForRedo = [];
        this.option = Object.assign(Object.assign({}, this.optionDefault), option);
        this.optionOrigin = JSON.parse(JSON.stringify(this.option));
        {
            const setEl = (canvasEl) => {
                canvasEl.style.padding = '0';
                canvasEl.style.margin = '0';
                canvasEl.style.boxSizing = 'border-box';
                canvasEl.style.height = 100 + '%';
                canvasEl.style.width = 100 + '%';
                canvasEl.style.cursor = 'none';
                canvasEl.style.top = '0';
                canvasEl.style.left = '0';
                canvasEl.style.position = 'absolute';
                canvasEl.style.background = 'rgba(255,255,255,0)';
            };
            //
            this.wrapperEl = document.createElement('div');
            setEl(this.wrapperEl);
            this.wrapperEl.style.position = 'relative';
            this.wrapperEl.style.background = 'rgba(255,255,255,1)';
            //
            this.canvasElOff = document.createElement('canvas');
            setEl(this.canvasElOff);
            const ctxOffTmp = this.canvasElOff.getContext('2d');
            if (ctxOffTmp === null) {
                throw 'getContext error';
            }
            else {
                this.ctxOff = ctxOffTmp;
            }
            //
            this.canvasElCursor = document.createElement('canvas');
            setEl(this.canvasElCursor);
            const ctxCursor = this.canvasElCursor.getContext('2d');
            if (ctxCursor === null) {
                throw 'getContext error';
            }
            else {
                this.ctxCursor = ctxCursor;
            }
            //
            this.canvasElBackground = document.createElement('canvas');
            setEl(this.canvasElBackground);
            const ctxBackground = this.canvasElBackground.getContext('2d');
            if (ctxBackground === null) {
                throw 'getContext error';
            }
            else {
                this.ctxBackground = ctxBackground;
            }
            //
            this.canvasEl = document.createElement('canvas');
            setEl(this.canvasEl);
            const ctx = this.canvasEl.getContext('2d');
            if (ctx === null) {
                throw 'getContext error';
            }
            else {
                this.ctx = ctx;
            }
            this.wrapperEl.append(this.canvasElBackground);
            this.wrapperEl.append(this.canvasEl);
            this.wrapperEl.append(this.canvasElCursor);
            htmlNode.append(this.wrapperEl);
        }
        this.setPad();
        this.setAction();
        this.setCursor();
    }
    setPad() {
        const setCanvasSize = (canvasEl) => {
            canvasEl.width = this.canvasEl.clientWidth;
            canvasEl.height = this.canvasEl.clientHeight;
        };
        setCanvasSize(this.canvasEl);
        setCanvasSize(this.canvasElOff);
        setCanvasSize(this.canvasElCursor);
        setCanvasSize(this.canvasElBackground);
        this.option.bgBoxNumX = this.optionOrigin.bgBoxNumX || parseInt(String(this.canvasEl.width / this.option.boxSize));
        this.option.bgBoxNumY = this.optionOrigin.bgBoxNumY || parseInt(String(this.canvasEl.height / this.option.boxSize));
        this.fillBg();
        this.ctx.drawImage(this.canvasElOff, 0, 0);
        this.fillBoxInCanvasByDrawInfo(this.drawInfoHistoryFull[this.drawInfoHistoryFull.length - 1] || []);
    }
    setAction() {
        const drawHandler = (e) => {
            const x = e.offsetX;
            const y = e.offsetY;
            const boxPosition = this.getBoxXY(x, y);
            // console.log('this.preDrawBoxPoint', this.preDrawBoxPoint)
            if (this.preDrawBoxPoint === null) {
                const boxX = boxPosition.x;
                const boxY = boxPosition.y;
                this.drawInfoHistory[this.drawInfoHistory.length - 1].push({ x: boxX, y: boxY, color: this.option.drawColor }); //擦除的位置color为null
                this.fillBoxInCanvasInOff(boxX, boxY, this.option.drawColor);
            }
            else {
                //起点和终点定位到当前格子的正中心
                const xStartFixed = Math.floor(this.preDrawBoxPoint.x / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2;
                const yStartFixed = Math.floor(this.preDrawBoxPoint.y / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2;
                const xEndFixed = Math.floor(x / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2;
                const yEndFixed = Math.floor(y / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2;
                //线段绘制信息
                const xLength = Math.abs(xEndFixed - xStartFixed);
                const yLength = Math.abs(yEndFixed - yStartFixed);
                const pathLength = Math.sqrt(Math.pow(yLength, 2) + Math.pow(xLength, 2));
                //x轴方向
                let xDirection = 0;
                if (xLength === 0) {
                    xDirection = 0;
                }
                else if (x > xStartFixed) {
                    xDirection = 1;
                }
                else if (x < xStartFixed) {
                    xDirection = -1;
                }
                // 从起始到终止，判断格子步长（以格子的宽度的一半，为增长量）
                const xProgress = this.option.boxSize / 2 / pathLength * xLength;
                const yProgress = this.option.boxSize / 2 / pathLength * yLength;
                let xStart;
                let yStart;
                let xEnd;
                let yEnd;
                //让x总是正向增长，及以更靠左的点为起始
                if (xDirection >= 0) {
                    xStart = xStartFixed;
                    yStart = yStartFixed;
                    xEnd = xEndFixed;
                    yEnd = yEndFixed;
                }
                else {
                    xStart = xEndFixed;
                    yStart = yEndFixed;
                    xEnd = xStartFixed;
                    yEnd = yStartFixed;
                }
                // 此次绘制y轴方向
                let yDirection = 0;
                if (yEnd === yStart) {
                    yDirection = 0;
                }
                else if (yEnd > yStart) {
                    yDirection = 1;
                }
                else if (yEnd < yStart) {
                    yDirection = -1;
                }
                // console.log('p ', xStart, yStart, xEnd, yEnd, xProgress)
                // console.log('d ', xDirection, yDirection)
                for (; xStart <= xEnd && (yDirection > 0 ? yStart <= yEnd : yStart >= yEnd); xStart += xProgress, yStart += yProgress * yDirection) {
                    // console.log(xStart, yStart, xEnd, yEnd, yDirection, xProgress, yProgress)
                    // console.log(xStart, yStart, Math.floor(xStart / this.option.boxSize), Math.floor(yStart / this.option.boxSize))
                    const boxX = Math.floor(xStart / this.option.boxSize);
                    const boxY = Math.floor(yStart / this.option.boxSize);
                    this.drawInfoHistory[this.drawInfoHistory.length - 1].push({ x: boxX, y: boxY, color: this.option.drawColor }); //擦除的位置color为null（但实际擦除位置使用背景色填充）
                    this.fillBoxInCanvasInOff(boxX, boxY, this.option.drawColor);
                }
            }
            this.preDrawBoxPoint = { x, y };
            this.ctx.drawImage(this.canvasElOff, 0, 0);
        };
        const mousedownEvent = (e) => {
            this.isDrawing = true;
            this.drawInfoHistoryFullForRedo = [];
            this.drawInfoHistoryForRedo = [];
            this.drawInfoHistory.push([]);
            drawHandler(e);
            this.canvasElCursor.addEventListener("mousemove", drawHandler);
        };
        const mouseupEvent = () => {
            if (this.isDrawing) {
                const drawImageInfo = this.buildDrawInfoFull();
                this.drawInfoHistoryFull.push(drawImageInfo);
                this.canvasElCursor.removeEventListener("mousemove", drawHandler);
                this.preDrawBoxPoint = null;
                this.isDrawing = false;
            }
        };
        this.canvasElCursor.addEventListener("mousedown", mousedownEvent);
        document.addEventListener("mouseup", mouseupEvent);
    }
    setCursor() {
        let curseImage;
        {
            const c = document.createElement('canvas');
            c.width = 15;
            c.height = 15;
            const ct = c.getContext('2d');
            if (ct !== null) {
                ct.beginPath();
                ct.moveTo(0, 0);
                ct.lineTo(c.width, c.height / 2);
                ct.lineTo(c.width / 2, c.height / 2);
                ct.lineTo(c.width / 2, c.height);
                ct.closePath();
                ct.lineWidth = 2;
                ct.strokeStyle = '#000';
                ct.stroke();
                ct.fillStyle = '#fff';
                ct.fill();
                ct.beginPath();
                ct.lineWidth = 4;
                ct.moveTo(-1, -1);
                ct.lineTo(1, 1);
                ct.stroke();
            }
            curseImage = c;
        }
        const mousemoveEvent = (e) => {
            const x = e.offsetX;
            const y = e.offsetY;
            this.ctxCursor.clearRect(0, 0, this.canvasElCursor.width, this.canvasElCursor.height);
            this.ctxCursor.drawImage(curseImage, x, y);
        };
        const mouseleaveEvent = () => {
            this.ctxCursor.clearRect(0, 0, this.canvasElCursor.width, this.canvasElCursor.height);
        };
        this.canvasElCursor.addEventListener("mousemove", mousemoveEvent);
        this.canvasElCursor.addEventListener("mouseleave", mouseleaveEvent);
    }
    fillBg() {
        for (let boxX = 0; boxX < this.option.bgBoxNumX; boxX++) {
            for (let boxY = 0; boxY < this.option.bgBoxNumY; boxY++) {
                this.fillBoxInCanvasInOff(boxX, boxY, this.option.bgColor);
            }
        }
        this.ctxBackground.drawImage(this.canvasElOff, 0, 0);
        this.ctxOff.clearRect(0, 0, this.canvasElOff.width, this.canvasElOff.height);
    }
    fillBoxInCanvasInOff(boxX, boxY, color) {
        if (boxX >= 0 && boxX <= this.option.bgBoxNumX && boxY >= 0 && boxY <= this.option.bgBoxNumY) {
            const gridLineWidth = Math.floor(Math.floor(this.option.gridLineWidth * 2) / 2 * 10) / 10;
            const pixFix = gridLineWidth % 2 === 0 ? 0 : 0.5;
            const splitLineStart = gridLineWidth / 2 + pixFix;
            const splitLineFix = gridLineWidth;
            const x = boxX * this.option.boxSize + splitLineStart;
            const y = boxY * this.option.boxSize + splitLineStart;
            const a = this.option.boxSize - splitLineFix;
            this.ctxOff.fillStyle = color || this.option.bgColor;
            this.ctxOff.fillRect(x, y, a, a);
        }
    }
    // 使用历史记录中的点填充画板
    fillBoxInCanvasByDrawInfo(drawInfo) {
        this.ctxOff.clearRect(0, 0, this.canvasElOff.width, this.canvasElOff.height);
        for (const pixel of drawInfo) {
            this.fillBoxInCanvasInOff(pixel.x, pixel.y, pixel.color);
        }
        this.ctx.drawImage(this.canvasElOff, 0, 0);
    }
    //通过鼠标坐标，获取方块数横纵坐标
    getBoxXY(pixelX, pixelY) {
        const x = Math.floor(pixelX / this.option.boxSize);
        const y = Math.floor(pixelY / this.option.boxSize);
        return { x, y };
    }
    buildDrawInfoFull() {
        const result = [];
        const d1 = this.drawInfoHistoryFull[this.drawInfoHistoryFull.length - 1];
        if (d1) {
            result.push(...d1);
        }
        const d2 = this.drawInfoHistory[this.drawInfoHistory.length - 1];
        if (d2) {
            result.push(...d2);
        }
        return result;
    }
    // 切换当前使用工具
    setUsingTool(toolName) {
        switch (toolName) {
            case ToolName.eraser:
                this.option.drawColor = null;
                break;
            case ToolName.pen:
            default:
                this.option.drawColor = this.optionOrigin.drawColor;
                break;
        }
    }
    // // 设置缩放等级
    // zoomUpdate(boxSize) {
    //     this.option.boxSize = Math.max(boxSize, this.option.boxSizeMin, 1)
    //     this.option.boxSize = Math.min(boxSize, this.option.boxSizeMax, 50)
    //     this.setPad()
    // }
    //
    // // 重置缩放等级
    // zoomReset() {
    //     this.option.boxSize = this.optionOrigin.boxSize
    //     this.setPad()
    // }
    //设置绘画颜色
    setColor(colorHex) {
        this.option.drawColor = colorHex;
    }
    // 撤销
    undo() {
        // 整图历史记录
        // 撤销时使用整图记录重绘
        const currentDrawImage = this.drawInfoHistoryFull.pop();
        if (currentDrawImage) {
            this.drawInfoHistoryFullForRedo.push(currentDrawImage);
            const undoDrawImage = this.drawInfoHistoryFull[this.drawInfoHistoryFull.length - 1];
            this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            this.fillBoxInCanvasByDrawInfo(undoDrawImage || []);
        }
        // 笔画历史记录
        const undoDraw = this.drawInfoHistory.pop();
        if (undoDraw) {
            this.drawInfoHistoryForRedo.push(undoDraw);
        }
    }
    // 重做
    redo() {
        // 整图历史记录
        const redoDrawImage = this.drawInfoHistoryFullForRedo.pop();
        if (redoDrawImage) {
            this.drawInfoHistoryFull.push(redoDrawImage);
        }
        // 笔画历史记录
        // 重做时使用笔画记录绘制
        const redoDraw = this.drawInfoHistoryForRedo.pop();
        if (redoDraw) {
            this.drawInfoHistory.push(redoDraw);
            this.fillBoxInCanvasByDrawInfo(redoDraw);
        }
    }
    // 使用保存的绘画像素信息填充画板，并作为一步绘画记录存储
    load(drawInfo) {
        this.drawInfoHistoryFullForRedo = [];
        this.drawInfoHistory = [];
        this.drawInfoHistoryFull.push(drawInfo);
        this.drawInfoHistory.push(drawInfo);
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        this.fillBoxInCanvasByDrawInfo(drawInfo);
    }
    // 使用保存的绘画像素信息填充画板
    view(drawInfo) {
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        this.fillBoxInCanvasByDrawInfo(drawInfo);
    }
    // 获取最终绘画像素信息
    save() {
        const finallyDrawInfo = [];
        for (const historyDraw of this.drawInfoHistory) {
            for (const historyPixel of historyDraw) {
                const existPixelIndex = finallyDrawInfo.findIndex(item => item && historyPixel && item.x === historyPixel.x && item.y === historyPixel.y);
                if (existPixelIndex >= 0) {
                    if (historyPixel.color === null) {
                        delete finallyDrawInfo[existPixelIndex];
                    }
                    else {
                        finallyDrawInfo[existPixelIndex] = historyPixel;
                    }
                }
                else {
                    finallyDrawInfo.push(historyPixel);
                }
            }
        }
        return finallyDrawInfo.filter(e => e);
    }
}
