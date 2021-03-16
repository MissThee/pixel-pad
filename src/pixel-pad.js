export default class PixelPad {
    wrapperEl
    canvasElOff
    ctxOff
    ctxCursor
    canvasElCursor
    ctxBackground
    canvasElBackground
    canvasEl
    ctx
    option = {}
    optionOrigin = {}
    optionDefault = {
        bgColor: '#e8e8e8',
        drawColor: '#00a711',
        boxSize: 8,
        boxSizeMin: 8,
        boxSizeMax: 20,
        gridLineWidth: 1,
    }
    preDrawBoxPoint = null
    isDrawing = false
    isReducingDrewBox = false
    useHistoryInfo = false//true使用记录的绘画记录绘制，可详细到绘制过程;false使用整张替换，无过程但更快
    drawHistoryImages = []
    drawHistoryImagesForRedo = []
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
        const setEl = (canvasEl) => {
            canvasEl.style.padding = '0'
            canvasEl.style.margin = '0'
            canvasEl.style.boxSizing = 'border-box'
            canvasEl.style.height = 100 + '%'
            canvasEl.style.width = 100 + '%'
            canvasEl.style.cursor = 'none'
            canvasEl.style.top = '0'
            canvasEl.style.left = '0'
            canvasEl.style.position = 'absolute'
            canvasEl.style.background = 'rgba(255,255,255,0)'
        }
        this.wrapperEl = document.createElement('div');
        setEl(this.wrapperEl)
        this.wrapperEl.style.position = 'relative'
        this.wrapperEl.style.background = 'rgba(255,255,255,1)'

        this.canvasElOff = document.createElement('canvas');
        this.ctxOff = this.canvasElOff.getContext('2d')
        setEl(this.canvasElOff)

        this.canvasElCursor = document.createElement('canvas');
        this.ctxCursor = this.canvasElCursor.getContext('2d')
        setEl(this.canvasElCursor)

        this.canvasElBackground = document.createElement('canvas');
        this.ctxBackground = this.canvasElBackground.getContext('2d')
        setEl(this.canvasElBackground)

        this.canvasEl = document.createElement('canvas');
        this.ctx = this.canvasEl.getContext('2d')
        setEl(this.canvasEl)

        this.wrapperEl.append(this.canvasElBackground)
        this.wrapperEl.append(this.canvasEl)
        this.wrapperEl.append(this.canvasElCursor)
        htmlNode.append(this.wrapperEl)
    }

    setPad() {
        const setCanvasSize = (canvasEl) => {
            canvasEl.width = this.canvasEl.clientWidth
            canvasEl.height = this.canvasEl.clientHeight
        }
        setCanvasSize(this.canvasEl)
        setCanvasSize(this.canvasElOff)
        setCanvasSize(this.canvasElCursor)
        setCanvasSize(this.canvasElBackground)
        this.option.bgBoxNumX = parseInt(String(this.canvasEl.width / this.option.boxSize))
        this.option.bgBoxNumY = parseInt(String(this.canvasEl.height / this.option.boxSize))
        this.fillBg()
        this.ctx.drawImage(this.canvasElOff, 0, 0)
        if (this.useHistoryInfo) {
            this.fillBoxInCanvasFastByDrawHistoryInfo()
        } else {
            this.fillBoxInCanvasFastByDrawHistoryImage()
        }
    }

    setAction() {
        const drawHandler = (e) => {
            const x = e.offsetX
            const y = e.offsetY
            const position = this.getBoxXY(x, y)
            // console.log('this.preDrawBoxPoint', this.preDrawBoxPoint)
            if (this.preDrawBoxPoint === null) {
                const boxX = position.boxX
                const boxY = position.boxY
                if (this.useHistoryInfo) {
                    this.drawHistoryInfo[this.drawHistoryInfo.length - 1].push({x: boxX, y: boxY, color: this.isReducingDrewBox ? null : this.option.drawColor})//擦除的位置color为null
                }
                this.fillBoxInCanvasInOff(boxX, boxY, this.isReducingDrewBox ? this.option.bgColor : this.option.drawColor)
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
                // console.log('p ', xStart, yStart, xEnd, yEnd, xProgress)
                // console.log('d ', xDirection, yDirection)
                for (; xStart <= xEnd && (yDirection > 0 ? yStart <= yEnd : yStart >= yEnd); xStart += xProgress, yStart += yProgress * yDirection) {
                    // console.log(xStart, yStart, xEnd, yEnd, yDirection, xProgress, yProgress)
                    // console.log(xStart, yStart, Math.floor(xStart / this.option.boxSize), Math.floor(yStart / this.option.boxSize))
                    const boxX = Math.floor(xStart / this.option.boxSize)
                    const boxY = Math.floor(yStart / this.option.boxSize)
                    if (this.useHistoryInfo) {
                        this.drawHistoryInfo[this.drawHistoryInfo.length - 1].push({x: boxX, y: boxY, color: this.isReducingDrewBox ? null : this.option.drawColor})//擦除的位置color为null
                    }
                    this.fillBoxInCanvasInOff(boxX, boxY, this.isReducingDrewBox ? this.option.bgColor : this.option.drawColor)
                }
            }
            this.preDrawBoxPoint = {x, y}
            this.ctx.drawImage(this.canvasElOff, 0, 0)
        }
        this.canvasElCursor.addEventListener("mousedown", (e) => {
            if (this.useHistoryInfo) {
                this.drawHistoryInfoForRedo = []
                this.drawHistoryInfo.push([])
            } else {
                this.drawHistoryImagesForRedo = []
                this.isDrawing = true
            }
            drawHandler(e)
            this.canvasElCursor.addEventListener("mousemove", drawHandler)
        })
        document.addEventListener("mouseup", () => {
            this.canvasElCursor.removeEventListener("mousemove", drawHandler)
            this.preDrawBoxPoint = null
            if (!this.useHistoryInfo) {
                if (this.isDrawing) {
                    this.drawHistoryImages.push(this.ctxOff.getImageData(0, 0, this.canvasElOff.width, this.canvasElOff.height))
                    this.isDrawing = false
                }
            }
        })
        let curseImage
        {
            const c = document.createElement('canvas')
            c.width = 15
            c.height = 15
            const ct = c.getContext('2d')
            ct.beginPath()
            ct.moveTo(0, 0)
            ct.lineTo(c.width, c.height / 2)
            ct.lineTo(c.width / 2, c.height / 2)
            ct.lineTo(c.width / 2, c.height)
            ct.closePath()
            ct.lineWidth = 2
            ct.strokeStyle = '#000'
            ct.stroke()
            ct.fillStyle = '#fff'
            ct.fill()

            ct.beginPath()
            ct.lineWidth = 4
            ct.moveTo(-1, -1)
            ct.lineTo(1, 1)
            ct.stroke()
            curseImage = c
        }
        this.canvasElCursor.addEventListener("mousemove", (e) => {
            const x = e.offsetX
            const y = e.offsetY
            this.ctxCursor.clearRect(0, 0, this.canvasElCursor.width, this.canvasElCursor.height)
            this.ctxCursor.drawImage(curseImage, x, y)
        })
        this.canvasElCursor.addEventListener("mouseleave", (e) => {
            this.ctxCursor.clearRect(0, 0, this.canvasElCursor.width, this.canvasElCursor.height)
        })

    }

    fillBg() {
        for (let boxX = 0; boxX < this.option.bgBoxNumX; boxX++) {
            for (let boxY = 0; boxY < this.option.bgBoxNumY; boxY++) {
                this.fillBoxInCanvasInOff(boxX, boxY)
            }
        }
        this.ctxBackground.drawImage(this.canvasElOff,0,0)
        this.ctxOff.clearRect(0,0,this.canvasElOff.width, this.canvasElOff.height)
    }

    fillBoxInCanvasInOff(boxX, boxY, color) {
        if (boxX >= 0 && boxX <= this.option.bgBoxNumX && boxY >= 0 && boxY <= this.option.bgBoxNumY) {
            const gridLineWidth = Math.floor(Math.floor(this.option.gridLineWidth * 2) / 2 * 10) / 10
            const pixFix = gridLineWidth % 2 === 0 ? 0 : 0.5
            const splitLineStart = gridLineWidth / 2 + pixFix
            const splitLineFix = gridLineWidth
            const x = boxX * this.option.boxSize + splitLineStart
            const y = boxY * this.option.boxSize + splitLineStart
            const w = this.option.boxSize - splitLineFix
            const h = w
            this.ctxOff.fillStyle = color || this.option.bgColor;
            this.ctxOff.fillRect(x, y, w, h);
        }
    }

    fillBoxInCanvasFastByDrawHistoryImage() {
        const lastImage = this.drawHistoryImages[this.drawHistoryImages.length - 1]
        if (lastImage) {
            this.ctx.putImageData(lastImage, 0, 0)
            this.ctxOff.putImageData(lastImage, 0, 0)
        } else {
            this.ctx.clearRect(0,0,this.canvasEl.width,this.canvasEl.height)
            this.ctxOff.clearRect(0,0,this.canvasElOff.width,this.canvasElOff.height)
        }
    }

    // 使用历史记录中的点填充画板
    fillBoxInCanvasFastByDrawHistoryInfo() {
        const finallyDrawInfo = this.save()
        this.ctxOff.clearRect(0,0,this.canvasElOff.width,this.canvasElOff.height)
        for (const pixel of finallyDrawInfo) {
            this.fillBoxInCanvasInOff(pixel.x, pixel.y, pixel.color)
        }
        this.ctx.drawImage(this.canvasElOff, 0, 0)
    }

    //通过鼠标坐标，获取方块数横纵坐标
    getBoxXY(x, y) {
        const boxX = Math.floor(x / this.option.boxSize)
        const boxY = Math.floor(y / this.option.boxSize)
        return {boxX, boxY}
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
        if (this.useHistoryInfo) {
            const undoDraw = this.drawHistoryInfo.pop()
            if (undoDraw) {
                this.drawHistoryInfoForRedo.push(undoDraw)
                this.ctx.clearRect(0,0,this.canvasEl.width,this.canvasEl.height)
                this.fillBoxInCanvasFastByDrawHistoryInfo()
            }
        } else {
            // console.log(' this.drawHistoryImages!!!', this.drawHistoryImages)
            const undoDraw = this.drawHistoryImages.pop()
            if (undoDraw) {
                this.drawHistoryImagesForRedo.push(undoDraw)
                this.fillBoxInCanvasFastByDrawHistoryImage()
                // console.log(' this.drawHistoryImagesXXX', this.drawHistoryImages)
            }
        }
    }

    // 重做
    redo() {
        if (this.useHistoryInfo) {
            const redoDraw = this.drawHistoryInfoForRedo.pop()
            if (redoDraw) {
                this.drawHistoryInfo.push(redoDraw)
                this.ctx.clearRect(0,0,this.canvasEl.width,this.canvasEl.height)
                this.fillBoxInCanvasFastByDrawHistoryInfo()
            }
        } else {
            const redoDraw = this.drawHistoryImagesForRedo.pop()
            if (redoDraw) {
                this.drawHistoryImages.push(redoDraw)
                this.fillBoxInCanvasFastByDrawHistoryImage()
            }
        }
    }

    // 使用保存的绘画像素信息填充画板
    load(drawInfo) {
        this.ctx.clearRect(0,0,this.canvasEl.width,this.canvasEl.height)
        for (const pixel of drawInfo) {
            this.fillBoxInCanvasInOff(pixel.x, pixel.y, pixel.color)
        }
        this.ctx.drawImage(this.canvasElOff, 0, 0)
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
