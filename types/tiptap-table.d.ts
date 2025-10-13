declare module '@tiptap/extension-table' {
  const Table: any
  export default Table
}

declare module '@tiptap/extension-table-row' {
  const TableRow: any
  export default TableRow
}

declare module '@tiptap/extension-table-cell' {
  const TableCell: any
  export default TableCell
}

declare module '@tiptap/extension-table-header' {
  const TableHeader: any
  export default TableHeader
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


