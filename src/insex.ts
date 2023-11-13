type CarouselSettings = {
  selector: string
  duration: number
  easing: string
  perPage: number
  startIndex: number
  draggable: boolean
  multipleDrag: boolean
  threshold: number
  loop: boolean
  rtl: boolean
  onInit: () => void
  onChange: () => void
  [key: string]: string | number | boolean | (() => void)
}

export default class Carousel {
  config: {
    selector: string
    duration: number
    easing: string
    perPage: number
    startIndex: number
    draggable: boolean
    multipleDrag: boolean
    threshold: number
    loop: boolean
    rtl: boolean
    onInit: () => void
    onChange: () => void
  }
  selector: any | null;
  [key: string]: any
  selectorWidth: number
  innerElements: Node[] = []
  currentSlide: number
  perPage: any | object | number
  transformProperty: 'transform' | 'WebkitTransform'
  pointerDown: boolean | undefined
  drag: {
    startX: number
    endX: number
    startY: number
    letItGo: boolean | null
    preventClick: boolean
  } = {
    startX: 0,
    endX: 0,
    startY: 0,
    letItGo: null,
    preventClick: false,
  }
  sliderFrame: HTMLDivElement | undefined

  constructor(options: Partial<CarouselSettings>) {
    this.config = Carousel.mergeSettings(options)
    this.selector =
      typeof this.config.selector === 'string'
        ? document.querySelector(this.config.selector)
        : this.config.selector
    if (this.selector === null) {
      throw new Error('Something wrong with your selector 😭')
    }
    this.resolveSlidesNumber()
    this.selectorWidth = this.selector.offsetWidth
    this.innerElements = [].slice.call(this.selector.children)
    this.currentSlide = this.config.loop
      ? this.config.startIndex % this.innerElements.length
      : Math.max(
          0,
          Math.min(
            this.config.startIndex,
            this.innerElements.length - this.perPage,
          ),
        )
    this.transformProperty = Carousel.webkitOrNot()
    ;[
      'resizeHandler',
      'touchstartHandler',
      'touchendHandler',
      'touchmoveHandler',
      'mousedownHandler',
      'mouseupHandler',
      'mouseleaveHandler',
      'mousemoveHandler',
      'clickHandler',
    ].forEach(method => {
      this[method] = this[method].bind(this)
    })

    this.init()
  }

  static mergeSettings(options: Partial<CarouselSettings>) {
    const settings: CarouselSettings = {
      selector: '.Carousel',
      duration: 200,
      easing: 'ease-out',
      perPage: 1,
      startIndex: 0,
      draggable: true,
      multipleDrag: true,
      threshold: 20,
      loop: false,
      rtl: false,
      onInit: () => {},
      onChange: () => {},
    }

    const userSettings = options
    for (const attrname in userSettings) {
      settings[attrname] = userSettings[
        attrname
      ] as CarouselSettings[keyof CarouselSettings]
    }

    return settings
  }

  static webkitOrNot() {
    const style = document.documentElement.style
    if (typeof style.transform === 'string') {
      return 'transform'
    }
    return 'WebkitTransform'
  }

  attachEvents() {
    window.addEventListener('resize', this.resizeHandler)

    if (this.config.draggable) {
      this.pointerDown = false
      this.drag = {
        startX: 0,
        endX: 0,
        startY: 0,
        letItGo: null,
        preventClick: false,
      }

      this.selector.addEventListener('touchstart', this.touchstartHandler)
      this.selector.addEventListener('touchend', this.touchendHandler)
      this.selector.addEventListener('touchmove', this.touchmoveHandler)

      this.selector.addEventListener('mousedown', this.mousedownHandler)
      this.selector.addEventListener('mouseup', this.mouseupHandler)
      this.selector.addEventListener('mouseleave', this.mouseleaveHandler)
      this.selector.addEventListener('mousemove', this.mousemoveHandler)

      this.selector.addEventListener('click', this.clickHandler)
    }
  }

  detachEvents() {
    window.removeEventListener('resize', this.resizeHandler)
    this.selector.removeEventListener('touchstart', this.touchstartHandler)
    this.selector.removeEventListener('touchend', this.touchendHandler)
    this.selector.removeEventListener('touchmove', this.touchmoveHandler)
    this.selector.removeEventListener('mousedown', this.mousedownHandler)
    this.selector.removeEventListener('mouseup', this.mouseupHandler)
    this.selector.removeEventListener('mouseleave', this.mouseleaveHandler)
    this.selector.removeEventListener('mousemove', this.mousemoveHandler)
    this.selector.removeEventListener('click', this.clickHandler)
  }

  init() {
    this.attachEvents()

    this.selector.style.overflow = 'hidden'

    this.selector.style.direction = this.config.rtl ? 'rtl' : 'ltr'

    this.buildSliderFrame()

    this.config.onInit.call(this)
  }

  buildSliderFrame() {
    const widthItem = this.selectorWidth / this.perPage
    const itemsToBuild = this.config.loop
      ? this.innerElements.length + 2 * this.perPage
      : this.innerElements.length
    this.sliderFrame = document.createElement('div')
    this.sliderFrame.style.width = `${widthItem * itemsToBuild}px`
    this.enableTransition()

    if (this.config.draggable) {
      this.selector.style.cursor = '-webkit-grab'
    }
    const docFragment = document.createDocumentFragment()
    if (this.config.loop) {
      for (
        let i = this.innerElements.length - this.perPage;
        i < this.innerElements.length;
        i++
      ) {
        const element = this.buildSliderFrameItem(
          this.innerElements[i]?.cloneNode(true) as Node,
        )
        docFragment.appendChild(element)
      }
    }
    for (let i = 0; i < this.innerElements.length; i++) {
      const element = this.buildSliderFrameItem(this.innerElements[i] as Node)
      docFragment.appendChild(element)
    }
    if (this.config.loop) {
      for (let i = 0; i < this.perPage; i++) {
        const element = this.buildSliderFrameItem(
          this.innerElements[i]?.cloneNode(true) as Node,
        )
        docFragment.appendChild(element)
      }
    }

    this.sliderFrame.appendChild(docFragment)
    this.selector.innerHTML = ''
    this.selector.appendChild(this.sliderFrame)
    this.slideToCurrent(true)
  }

  buildSliderFrameItem(elm: Node) {
    const elementContainer = document.createElement('div')
    elementContainer.style.cssFloat = this.config.rtl ? 'right' : 'left'
    elementContainer.style.float = this.config.rtl ? 'right' : 'left'
    elementContainer.style.width = `${
      this.config.loop
        ? 100 / (this.innerElements.length + this.perPage * 2)
        : 100 / this.innerElements.length
    }%`
    elementContainer.appendChild(elm as Node)
    return elementContainer
  }

  resolveSlidesNumber() {
    if (typeof this.config.perPage === 'number') {
      this.perPage = this.config.perPage
    } else if (typeof this.config.perPage === 'object') {
      this.perPage = 1

      for (const viewport in this.config.perPage as Record<string, number>) {
        if (window.innerWidth >= Number(viewport)) {
          this.perPage = this.config.perPage[viewport]
        }
      }
    }
  }

  prev(howManySlides = 1, callback?: () => void) {
    if (this.innerElements.length <= this.perPage) {
      return
    }

    const beforeChange = this.currentSlide

    if (this.config.loop) {
      const isNewIndexClone = this.currentSlide - howManySlides < 0
      if (isNewIndexClone) {
        this.disableTransition()

        const mirrorSlideIndex = this.currentSlide + this.innerElements.length
        const mirrorSlideIndexOffset = this.perPage
        const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset
        const offset =
          (this.config.rtl ? 1 : -1) *
          moveTo *
          (this.selectorWidth / this.perPage)
        const dragDistance = this.config.draggable
          ? this.drag!.endX - this.drag!.startX
          : 0

        this.sliderFrame!.style[this.transformProperty as any] = `translate3d(${
          offset + dragDistance
        }px, 0, 0)`
        this.currentSlide = mirrorSlideIndex - howManySlides
      } else {
        this.currentSlide = this.currentSlide - howManySlides
      }
    } else {
      this.currentSlide = Math.max(this.currentSlide - howManySlides, 0)
    }

    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent(this.config.loop)
      this.config.onChange.call(this)
      if (callback) {
        callback.call(this)
      }
    }
  }

  next(howManySlides = 1, callback?: () => void) {
    if (this.innerElements.length <= this.perPage) {
      return
    }

    const beforeChange = this.currentSlide

    if (this.config.loop) {
      const isNewIndexClone =
        this.currentSlide + howManySlides >
        this.innerElements.length - this.perPage
      if (isNewIndexClone) {
        this.disableTransition()

        const mirrorSlideIndex = this.currentSlide - this.innerElements.length
        const mirrorSlideIndexOffset = this.perPage
        const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset
        const offset =
          (this.config.rtl ? 1 : -1) *
          moveTo *
          (this.selectorWidth / this.perPage)
        const dragDistance = this.config.draggable
          ? this.drag!.endX - this.drag!.startX
          : 0

        this.sliderFrame!.style[this.transformProperty as any] = `translate3d(${
          offset + dragDistance
        }px, 0, 0)`
        this.currentSlide = mirrorSlideIndex + howManySlides
      } else {
        this.currentSlide = this.currentSlide + howManySlides
      }
    } else {
      this.currentSlide = Math.min(
        this.currentSlide + howManySlides,
        this.innerElements.length - this.perPage,
      )
    }
    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent(this.config.loop)
      this.config.onChange.call(this)
      if (callback) {
        callback.call(this)
      }
    }
  }

  disableTransition() {
    this.sliderFrame!.style.transition = `all 0ms ${this.config.easing}`
  }

  enableTransition() {
    this.sliderFrame!.style.transition = `all ${this.config.duration}ms ${this.config.easing}`
  }

  goTo(index: number, callback?: () => void) {
    if (this.innerElements.length <= this.perPage) {
      return
    }
    const beforeChange = this.currentSlide
    this.currentSlide = this.config.loop
      ? index % this.innerElements.length
      : Math.min(Math.max(index, 0), this.innerElements.length - this.perPage)
    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent(true)
      this.config.onChange.call(this)
      if (callback) {
        callback.call(this)
      }
    }
  }

  slideToCurrent(enableTransition: boolean | undefined) {
    const currentSlide = this.config.loop
      ? this.currentSlide + this.perPage
      : this.currentSlide
    const offset =
      (this.config.rtl ? 1 : -1) *
      currentSlide *
      (this.selectorWidth / this.perPage)

    if (enableTransition) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.enableTransition()
          this.sliderFrame!.style[this.transformProperty as any] =
            `translate3d(${offset}px, 0, 0)`
        })
      })
    } else {
      this.sliderFrame!.style[this.transformProperty as any] =
        `translate3d(${offset}px, 0, 0)`
    }
  }

  updateAfterDrag() {
    const movement =
      (this.config.rtl ? -1 : 1) * (this.drag!.endX - this.drag!.startX)
    const movementDistance = Math.abs(movement)
    const howManySliderToSlide = this.config.multipleDrag
      ? Math.ceil(movementDistance / (this.selectorWidth / this.perPage))
      : 1

    const slideToNegativeClone =
      movement > 0 && this.currentSlide - howManySliderToSlide < 0
    const slideToPositiveClone =
      movement < 0 &&
      this.currentSlide + howManySliderToSlide >
        this.innerElements.length - this.perPage

    if (
      movement > 0 &&
      movementDistance > this.config.threshold &&
      this.innerElements.length > this.perPage
    ) {
      this.prev(howManySliderToSlide)
    } else if (
      movement < 0 &&
      movementDistance > this.config.threshold &&
      this.innerElements.length > this.perPage
    ) {
      this.next(howManySliderToSlide)
    }
    this.slideToCurrent(slideToNegativeClone || slideToPositiveClone)
  }

  resizeHandler() {
    this.resolveSlidesNumber()

    if (this.currentSlide + this.perPage > this.innerElements.length) {
      this.currentSlide =
        this.innerElements.length <= this.perPage
          ? 0
          : this.innerElements.length - this.perPage
    }

    this.selectorWidth = this.selector.offsetWidth

    this.buildSliderFrame()
  }

  clearDrag() {
    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      letItGo: null,
      preventClick: this.drag!.preventClick,
    }
  }

  touchstartHandler(e: {
    target: { nodeName: string }
    stopPropagation: () => void
    touches?: {
      pageX: any
      pageY: any
    }[]
  }) {
    const ignoreCarousel =
      ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !==
      -1
    if (ignoreCarousel) {
      return
    }

    e.stopPropagation()
    this.pointerDown = true
    this.drag!.startX = e.touches?.[0]?.pageX
    this.drag!.startY = e.touches?.[0]?.pageY
  }

  touchendHandler(e: { stopPropagation: () => void }) {
    e.stopPropagation()
    this.pointerDown = false
    this.enableTransition()
    if (this.drag!.endX) {
      this.updateAfterDrag()
    }
    this.clearDrag()
  }

  touchmoveHandler(e: {
    stopPropagation: () => void
    touches: {
      pageY: any
      pageX: any
    }[]
    preventDefault: () => void
  }) {
    e.stopPropagation()

    if (this.drag!.letItGo === null) {
      this.drag.letItGo =
        Math.abs(this.drag!.startY - e.touches[0]?.pageY) <
        Math.abs(this.drag!.startX - e.touches[0]?.pageX)
    }

    if (this.pointerDown && this.drag!.letItGo) {
      e.preventDefault()
      this.drag!.endX = e.touches[0]?.pageX
      this.sliderFrame!.style.transition = `all 0ms ${this.config.easing}`

      const currentSlide = this.config.loop
        ? this.currentSlide + this.perPage
        : this.currentSlide
      const currentOffset = currentSlide * (this.selectorWidth / this.perPage)
      const dragOffset = this.drag!.endX - this.drag!.startX
      const offset = this.config.rtl
        ? currentOffset + dragOffset
        : currentOffset - dragOffset
      this.sliderFrame!.style[this.transformProperty as any] = `translate3d(${
        (this.config.rtl ? 1 : -1) * offset
      }px, 0, 0)`
    }
  }

  mousedownHandler(e: {
    target: { nodeName: string }
    preventDefault: () => void
    stopPropagation: () => void
    pageX: any
  }) {
    const ignoreCarousel =
      ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !==
      -1
    if (ignoreCarousel) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    this.pointerDown = true
    this.drag!.startX = e.pageX
  }

  mouseupHandler(e: { stopPropagation: () => void }) {
    e.stopPropagation()
    this.pointerDown = false
    this.selector.style.cursor = '-webkit-grab'
    this.enableTransition()
    if (this.drag!.endX) {
      this.updateAfterDrag()
    }
    this.clearDrag()
  }

  mousemoveHandler(e: {
    preventDefault: () => void
    target: { nodeName: string }
    pageX: any
  }) {
    e.preventDefault()
    if (this.pointerDown) {
      if (e.target.nodeName === 'A') {
        this.drag!.preventClick = true
      }

      this.drag!.endX = e.pageX
      this.selector.style.cursor = '-webkit-grabbing'
      this.sliderFrame!.style.webkitTransition = `all 0ms ${this.config.easing}`
      this.sliderFrame!.style.transition = `all 0ms ${this.config.easing}`

      const currentSlide = this.config.loop
        ? this.currentSlide + this.perPage
        : this.currentSlide
      const currentOffset = currentSlide * (this.selectorWidth / this.perPage)
      const dragOffset = this.drag!.endX - this.drag!.startX
      const offset = this.config.rtl
        ? currentOffset + dragOffset
        : currentOffset - dragOffset
      this.sliderFrame!.style[this.transformProperty as any] = `translate3d(${
        (this.config.rtl ? 1 : -1) * offset
      }px, 0, 0)`
    }
  }

  mouseleaveHandler(e: { pageX: number }) {
    if (this.pointerDown) {
      this.pointerDown = false
      this.selector.style.cursor = '-webkit-grab'
      this.drag!.endX = e.pageX
      this.drag!.preventClick = false
      this.enableTransition()
      this.updateAfterDrag()
      this.clearDrag()
    }
  }

  clickHandler(e: { preventDefault: () => void }) {
    if (this.drag!.preventClick) {
      e.preventDefault()
    }
    this.drag!.preventClick = false
  }

  remove(index: number, callback?: () => void) {
    if (index < 0 || index >= this.innerElements.length) {
      throw new Error("Item to remove doesn't exist 😭")
    }
    const lowerIndex = index < this.currentSlide
    const lastItem = this.currentSlide + this.perPage - 1 === index

    if (lowerIndex || lastItem) {
      this.currentSlide--
    }

    this.innerElements.splice(index, 1)
    this.buildSliderFrame()

    if (callback) {
      callback.call(this)
    }
  }

  insert(item: HTMLElement, index: number, callback?: () => void) {
    if (index < 0 || index > this.innerElements.length + 1) {
      throw new Error('Unable to insert it at this index 😭')
    }
    if (this.innerElements.indexOf(item as never) !== -1) {
      throw new Error('The same item in a carousel? Really? Nope 😭')
    }

    const shouldItShift =
      index <= this.currentSlide &&
      this.currentSlide > 0 &&
      this.innerElements.length > 0

    this.currentSlide = shouldItShift
      ? this.currentSlide + 1
      : this.currentSlide

    this.innerElements.splice(index, 0, item as never)
    this.buildSliderFrame()

    if (callback) {
      callback.call(this)
    }
  }

  prepend(item: HTMLElement, callback?: () => void) {
    this.insert(item, 0)
    if (callback) {
      callback.call(this)
    }
  }

  append(item: HTMLElement, callback?: () => void) {
    this.insert(item, this.innerElements.length + 1)
    if (callback) {
      callback.call(this)
    }
  }

  destroy(restoreMarkup = false, callback?: () => void) {
    this.detachEvents()

    this.selector.style.cursor = 'auto'

    if (restoreMarkup) {
      const slides = document.createDocumentFragment()
      for (let i = 0; i < this.innerElements.length; i++) {
        if (this.innerElements[i]) {
          slides.appendChild(this.innerElements[i] as Node)
        }
      }
      this.selector.innerHTML = ''
      this.selector.appendChild(slides)
      this.selector.removeAttribute('style')
    }

    if (callback) {
      callback.call(this)
    }
  }
}
