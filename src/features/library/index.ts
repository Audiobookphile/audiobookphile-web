/**
 * Library Feature — barrel export.
 */

export * from './actions/collectionActions'
// Actions
export * from './actions/libraryActions'
export * from './actions/playlistActions'
export * from './actions/searchActions'
// Components
export { default as BookShelfGrid } from './components/BookShelfGrid'
export { default as BookShelfRow } from './components/BookShelfRow'
export { default as LibraryFilesTable } from './components/LibraryFilesTable'
export { LibraryStatsDashboard } from './components/LibraryStatsDashboard'
export { CardSizeProvider, useCardSize } from './contexts/CardSizeContext'
// Contexts
export { LibraryProvider, useBookCoverAspectRatio, useLibrary, useLibraryOptional } from './contexts/LibraryContext'
// Hooks
export { useBookshelfData } from './hooks/useBookshelfData'
export { useBookshelfQuery } from './hooks/useBookshelfQuery'
export { useBookshelfUpdater } from './hooks/useBookshelfUpdater'
export { useBookshelfVirtualizer } from './hooks/useBookshelfVirtualizer'
export { useFilterData } from './hooks/useFilterData'
export { useGlobalSearchTransformer } from './hooks/useGlobalSearchTransformer'
export { useInfiniteBookshelf } from './hooks/useInfiniteBookshelf'
export { useItemPageSocket } from './hooks/useItemPageSocket'
export { useLibrariesQuery } from './hooks/useLibrariesQuery'
export { useLibraryFileActions } from './hooks/useLibraryFileActions'
export { useLibrarySearch } from './hooks/useLibrarySearch'
export { useLibraryStats } from './hooks/useLibraryStats'
