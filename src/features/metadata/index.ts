/**
 * Metadata Feature — barrel export.
 */

export { default as AuthorImage } from './components/AuthorImage'
export { default as CoverEdit } from './components/CoverEdit'
export { default as Match } from './components/Match'
// Components
export { default as PreviewCover } from './components/PreviewCover'

// Contexts
export { MetadataProvider, useBookProviders, useMetadata, usePodcastProviders } from './contexts/MetadataContext'

// Hooks
export { useAuthorActions } from './hooks/useAuthorActions'
export { useDetailsEdit } from './hooks/useDetailsEdit'
