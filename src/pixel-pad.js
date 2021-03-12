export default class PixelPad {
    canvasEl
    ctx
    option = {}
    optionOrigin = {}
    optionDefault = {
        bgColor: '#e8e8e8',
        drawColor: '#00a711',
        boxSize: 10,
        boxSizeMin: 5,
        boxSizeMax: 20,
        gridLineWidth: 1,
    }
    preDrawBoxPoint = null
    // isMoving = false
    isReducingDrewBox = false
    drawHistoryInfo = []
    drawHistoryInfoForRedo = []

    constructor(htmlNode, option) {
        this.option = {...this.optionDefault, ...option}
        this.optionOrigin = JSON.parse(JSON.stringify(this.option))
        this.initCanvasEl(htmlNode)
        this.setPad()
        this.setAction()
    }

    initCanvasEl(htmlNode) {
        const canvasEl = document.createElement('canvas');
        canvasEl.style.padding = '0'
        canvasEl.style.margin = '0'
        canvasEl.style.boxSizing = 'border-box'
        canvasEl.style.height = 100 + '%'
        canvasEl.style.width = 100 + '%'
        htmlNode.append(canvasEl)
        this.canvasEl = canvasEl
        this.ctx = canvasEl.getContext('2d')
    }

    setPad() {
        this.canvasEl.width = this.canvasEl.clientWidth
        this.canvasEl.height = this.canvasEl.clientHeight
        this.option.bgBoxNumX = parseInt(String(this.canvasEl.width / this.option.boxSize))
        this.option.bgBoxNumY = parseInt(String(this.canvasEl.height / this.option.boxSize))
        this.fillBg()
        this.fillBoxInCanvasFastByDrawHistoryInfo()
    }

    setAction() {
        const drawHandler = (e) => {
            const x = e.pageX - this.canvasEl.getBoundingClientRect().left
            const y = e.pageY - this.canvasEl.getBoundingClientRect().top
            const position = this.getBoxXY(x, y)
            console.log('this.preDrawBoxPoint',this.preDrawBoxPoint)
            if (this.preDrawBoxPoint === null) {
                this.drawBox(position.boxX, position.boxY)
            } else {
                //起点和终点定位到当前格子的正中心
                const xStartFixed = Math.floor(this.preDrawBoxPoint.x / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2
                const yStartFixed = Math.floor(this.preDrawBoxPoint.y / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2
                const xEndFixed = Math.floor(x / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2
                const yEndFixed = Math.floor(y / this.option.boxSize) * this.option.boxSize + this.option.boxSize / 2
                //线段绘制信息
                const xLength = Math.abs(xEndFixed - xStartFixed)
                const yLength = Math.abs(yEndFixed - yStartFixed)
                const pathLength = Math.sqrt(Math.pow(yLength, 2) + Math.pow(xLength, 2))
                //x轴方向
                let xDirection
                if (xLength === 0) {
                    xDirection = 0
                } else if (x > xStartFixed) {
                    xDirection = 1
                } else if (x < xStartFixed) {
                    xDirection = -1
                }
                // 从起始到终止，判断格子步长（以格子的宽度的一半，为增长量）
                const xProgress = this.option.boxSize / 2 / pathLength * xLength
                const yProgress = this.option.boxSize / 2 / pathLength * yLength

                let xStart
                let yStart
                let xEnd
                let yEnd
                //让x总是正向增长，及以更靠左的点为起始
                if (xDirection >= 0) {
                    xStart = xStartFixed
                    yStart = yStartFixed
                    xEnd = xEndFixed
                    yEnd = yEndFixed
                } else {
                    xStart = xEndFixed
                    yStart = yEndFixed
                    xEnd = xStartFixed
                    yEnd = yStartFixed
                }
                // 此次绘制y轴方向
                let yDirection
                if (yEnd === yStart) {
                    yDirection = 0
                } else if (yEnd > yStart) {
                    yDirection = 1
                } else if (yEnd < yStart) {
                    yDirection = -1
                }
                console.log('p ', xStart, yStart, xEnd, yEnd, xProgress)
                console.log('d ', xDirection, yDirection)
                for (; xStart <= xEnd && (yDirection > 0 ? yStart <= yEnd : yStart >= yEnd); xStart += xProgress, yStart += yProgress * yDirection) {
                    console.log(xStart,yStart,xEnd,yEnd,yDirection,xProgress,yProgress)
                    // console.log(xStart, yStart, Math.floor(xStart / this.option.boxSize), Math.floor(yStart / this.option.boxSize))
                    this.drawBox(Math.floor(xStart / this.option.boxSize), Math.floor(yStart / this.option.boxSize))
                }
            }
            this.preDrawBoxPoint = {x, y}

        }
        // const moveHandler = (e) => {
        //
        // }

        // document.addEventListener('keydown', (e) => {
        //     if (e.key === 'Control') {
        //         this.canvasEl.style.cursor='move'
        //         this.isMoving = true
        //     }
        // })
        // document.addEventListener('keyup', (e) => {
        //     if (e.key === 'Control') {
        //         this.canvasEl.style.cursor='auto'
        //         this.isMoving = false
        //     }
        // })

        this.canvasEl.addEventListener("mousedown", (e) => {
            // if (this.isMoving) {
            //     this.canvasEl.addEventListener("mousemove", moveHandler)
            // } else {
            this.drawHistoryInfoForRedo = []
            this.drawHistoryInfo.push([])
            drawHandler(e)
            this.canvasEl.addEventListener("mousemove", drawHandler)
            // }
        })
        document.addEventListener("mouseup", () => {
            // this.canvasEl.removeEventListener("mousemove", moveHandler)
            this.canvasEl.removeEventListener("mousemove", drawHandler)
            // this.preDrawBoxPoint=null
        })
    }

    fillBg() {
        for (let boxX = 0; boxX < this.option.bgBoxNumX; boxX++) {
            for (let boxY = 0; boxY < this.option.bgBoxNumY; boxY++) {
                this.fillBoxInCanvas(boxX, boxY)
            }
        }
    }

    fillBoxInCanvas(boxX, boxY, color) {
        if (boxX >= 0 && boxX <= this.option.bgBoxNumX && boxY >= 0 && boxY <= this.option.bgBoxNumY) {
            const gridLineWidth = Math.floor(Math.floor(this.option.gridLineWidth * 2) / 2 * 10) / 10
            const pixFix = gridLineWidth % 2 === 0 ? 0 : 0.5
            const splitLineStart = gridLineWidth / 2 + pixFix
            const splitLineFix = gridLineWidth
            const x = boxX * this.option.boxSize + splitLineStart
            const y = boxY * this.option.boxSize + splitLineStart
            const w = this.option.boxSize - splitLineFix
            const h = w
            this.ctx.beginPath()
            this.ctx.fillStyle = color || this.option.bgColor;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.fill()
            this.ctx.stroke()
            this.ctx.closePath()
        }
    }

    // 使用历史记录中的点填充画板
    fillBoxInCanvasFastByDrawHistoryInfo() {
        const finallyDrawInfo = this.save()
        for (const pixel of finallyDrawInfo) {
            this.fillBoxInCanvas(pixel.x, pixel.y, pixel.color)
        }
    }

    //通过鼠标坐标，获取方块数横纵坐标
    getBoxXY(x, y) {
        const boxX = Math.floor(x / this.option.boxSize)
        const boxY = Math.floor(y / this.option.boxSize)
        return {boxX, boxY}
    }

    drawBox(boxX, boxY) {
        const currentDrawHistoryInfo = this.drawHistoryInfo[this.drawHistoryInfo.length - 1]
        currentDrawHistoryInfo.push({x: boxX, y: boxY, color: this.isReducingDrewBox ? null : this.option.drawColor})//擦除的位置color为null
        this.fillBoxInCanvas(boxX, boxY, this.isReducingDrewBox ? this.option.bgColor : this.option.drawColor)
    }

    // 切换当前使用工具
    setUsingTool(toolName) {
        switch (toolName) {
            case "eraser":
                this.isReducingDrewBox = true
                break;
            default:
                this.isReducingDrewBox = false
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
        this.option.drawColor = colorHex
    }

    // 撤销
    undo() {
        const undoDraw = this.drawHistoryInfo.pop()
        if (undoDraw) {
            this.drawHistoryInfoForRedo.push(undoDraw)
            this.fillBg()
            this.fillBoxInCanvasFastByDrawHistoryInfo()
        }
    }

    // 重做
    redo() {
        const redoDraw = this.drawHistoryInfoForRedo.pop()
        if (redoDraw) {
            this.drawHistoryInfo.push(redoDraw)
            this.fillBg()
            this.fillBoxInCanvasFastByDrawHistoryInfo()
        }
    }

    // 使用保存的绘画像素信息填充画板
    load(drawInfo) {
        this.fillBg()
        for (const pixel of drawInfo) {
            this.fillBoxInCanvas(pixel.x, pixel.y, pixel.color)
        }
    }

    // 获取最终绘画像素信息
    save() {
        const finallyDrawInfo = []
        for (const historyDraw of this.drawHistoryInfo) {
            for (const historyPixel of historyDraw) {
                const existPixelIndex = finallyDrawInfo.findIndex(item => item && historyPixel && item.x === historyPixel.x && item.y === historyPixel.y)
                if (existPixelIndex >= 0) {
                    if (historyPixel.color === null) {
                        delete finallyDrawInfo[existPixelIndex]
                    } else {
                        finallyDrawInfo[finallyDrawInfo] = historyPixel
                    }
                } else {
                    finallyDrawInfo.push(historyPixel)
                }
            }
        }
        return finallyDrawInfo.filter(e => e)
    }
}
