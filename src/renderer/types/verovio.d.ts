declare module 'verovio/wasm' {
  function createVerovioModule(): Promise<any>
  export default createVerovioModule
}

declare module 'verovio/esm' {
  export class VerovioToolkit {
    constructor(module: any)
    loadData(data: string): boolean
    renderToSVG(page: number): string
    setOptions(options: Record<string, any>): void
    getPageCount(): number
    getElementsAtTime(time: number): any
    getMEI(): string
    edit(params: any): void
  }
}
