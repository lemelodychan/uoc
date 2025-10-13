declare module '@tiptap/extension-table' {
  export const Table: any
}

declare module '@tiptap/extension-table-row' {
  export const TableRow: any
}

declare module '@tiptap/extension-table-cell' {
  export const TableCell: any
}

declare module '@tiptap/extension-table-header' {
  export const TableHeader: any
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) => ReturnType
      addColumnBefore: () => ReturnType
      addColumnAfter: () => ReturnType
      deleteColumn: () => ReturnType
      addRowBefore: () => ReturnType
      addRowAfter: () => ReturnType
      deleteRow: () => ReturnType
      deleteTable: () => ReturnType
      toggleHeaderRow: () => ReturnType
      toggleHeaderColumn: () => ReturnType
      toggleHeaderCell: () => ReturnType
      setCellAttribute: (name: string, value: unknown) => ReturnType
      selectRow: () => ReturnType
      selectColumn: () => ReturnType
      selectTable: () => ReturnType
    }
  }
}


