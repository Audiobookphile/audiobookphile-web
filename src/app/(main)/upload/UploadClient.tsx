'use client'

import { Info, RefreshCw, X } from 'lucide-react'
import { bytesPretty } from '@/shared/lib/string'
import Btn from '@/shared/ui/Btn'
import CollapsibleTable from '@/shared/ui/CollapsibleTable'
import Dropdown from '@/shared/ui/Dropdown'
import IconBtn from '@/shared/ui/IconBtn'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'
import ProgressIndicator from '@/shared/ui/ProgressIndicator'
import TableRow from '@/shared/ui/TableRow'
import TextInput from '@/shared/ui/TextInput'
import ToggleSwitch from '@/shared/ui/ToggleSwitch'
import Tooltip from '@/shared/ui/Tooltip'
import Alert from '@/shared/widgets/Alert'
import DragDrop from '@/shared/widgets/DragDrop'
import FilePicker from '@/shared/widgets/FilePicker'
import type { Library } from '@/types/api'
import { useUploader } from './useUploader'

interface LibraryClientProps {
  libraries: Library[]
}

export default function UploadClient({ libraries }: LibraryClientProps) {
  const {
    t,
    bookProviders,
    selectedLibrary,
    setSelectedLibrary,
    autoFetch,
    setAutoFetch,
    selectedProvider,
    setSelectedProvider,
    uploadProcessing,
    uploadFinished,
    uploadItems,
    ignoredFiles,
    errors,
    expandedTables,
    libraryItems,
    currentLibraryMediaType,
    supFileTypes,
    handleFilesDropped,
    handleDialogFileSelected,
    getDirectory,
    resetUpload,
    handleItemPropertyChange,
    toggleTableExpanded,
    handleFetchMetadata,
    handleRemoveStagedItem,
    handleStartUpload,
  } = useUploader(libraries)

  function preventDef(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
  }

  const tableHeaders = [
    { label: t('LabelFilename'), className: 'text-left px-2' },
    { label: t('LabelSize'), className: 'text-left' },
    { label: t('LabelType'), className: 'text-left' },
  ]
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-8"
      draggable={false}
      onDragEnter={preventDef}
      onDragOver={preventDef}
      onDragEnd={preventDef}
      onDrop={preventDef}
    >
      {/* First row: Library, Folder, Media Type */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="library" className="mb-1 block px-1 text-sm font-medium">
            {t('LabelLibrary')}
          </label>
          <Dropdown
            items={libraryItems}
            value={selectedLibrary}
            onChange={(value) => {
              setSelectedLibrary(value as string)
            }}
          />
        </div>

        <div className="w-32 min-w-32">
          <label htmlFor="mediaType" className="mb-1 block px-1 text-sm font-medium">
            {t('LabelMediaType')}
          </label>
          <TextInput id="mediaType" readOnly={true} value={currentLibraryMediaType} />
        </div>
      </div>
      {/* Second row: Auto Fetch, Metadata Provider (books only) */}
      {currentLibraryMediaType === 'book' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center pt-6">
            <ToggleSwitch
              label={t('LabelAutoFetchMetadata')}
              value={autoFetch}
              className="pr-0"
              onChange={setAutoFetch}
            />
            <Tooltip maxWidth={300} text={t('LabelAutoFetchMetadataHelp')}>
              <Info size={18} className="cursor-help text-white/40 transition-colors hover:text-primary" />
            </Tooltip>
          </div>

          <div className="min-w-[200px] flex-1">
            <label htmlFor="provider" className="mb-1 block px-1 text-sm font-medium">
              {t('LabelProvider')}
            </label>
            <Dropdown
              items={bookProviders}
              value={selectedProvider}
              onChange={(value) => setSelectedProvider(value as string)}
            />
          </div>
        </div>
      )}
      {/* Add Files / drag and drop */}
      {uploadItems.length === 0 && errors === '' && (
        <div className="text-center">
          <DragDrop onFilesDropped={handleFilesDropped}>
            <p className="px-6 pt-6 text-2xl">{t('LabelUploaderDragAndDrop')}</p>
            <p className="p-6">{t('MessageOr')}</p>
            <div className="flex justify-center gap-4">
              <FilePicker accept={supFileTypes} onFilesSelected={handleDialogFileSelected}>
                {t('ButtonChooseFiles')}
              </FilePicker>
              <FilePicker multiple={true} directory={true} onFilesSelected={handleDialogFileSelected}>
                {t('ButtonChooseAFolder')}
              </FilePicker>
            </div>
            <p className="p-6 text-xs text-foreground-subdued">
              <strong>{t('LabelSupportedFileTypes')}:</strong> {supFileTypes}
            </p>
            <p className="px-6 pb-6 text-sm text-foreground-subdued">
              {t('NoteUploaderFoldersWithMediaFiles')}{' '}
              {currentLibraryMediaType === 'book' ? t('NoteUploaderOnlyAudioFiles') : ''}
            </p>
          </DragDrop>
        </div>
      )}

      {/* 'staging' area */}
      {(uploadItems.length > 0 || ignoredFiles.length > 0 || errors !== '') && (
        <>
          <div className="flex w-full items-center border-b border-border py-4">
            <p className="flex-1 text-lg">{t('LabelXItems', { 0: uploadItems.length })}</p>
            <Btn disabled={uploadProcessing} size="small" onClick={resetUpload}>
              {t('ButtonReset')}
            </Btn>
          </div>
          {errors === 'MessageNoItemsFound' && (
            <Alert type="error" autoFocus={false}>
              <div className="pe-4">
                <p>{t('MessageNoItemsFound')}</p>
              </div>
            </Alert>
          )}
          {ignoredFiles.length > 0 && (
            <Alert type="warning" autoFocus={false}>
              <div className="pe-8">
                <p>{t('NoteUploaderUnsupportedFiles')}</p>
                <div className="text-read-only">
                  <CollapsibleTable
                    tableClassName="bg-bg"
                    title={t('HeaderIgnoredFiles')}
                    count={ignoredFiles.length}
                    // hard coded to index 0 as there will only be one ignored files table
                    expanded={expandedTables[`0-ignoredFiles`] || false}
                    onExpandedChange={() => toggleTableExpanded(0, 'ignoredFiles')}
                    tableHeaders={tableHeaders}
                  >
                    {ignoredFiles.map((file) => (
                      <TableRow key={file.name} className="text-left">
                        <td>
                          <p className="pl-2">{file.name}</p>
                        </td>
                        <td>
                          <p>{bytesPretty(file.size)}</p>
                        </td>
                        <td>
                          <p>{file.filetype}</p>
                        </td>
                      </TableRow>
                    ))}
                  </CollapsibleTable>
                </div>
                <p className="text-xs text-foreground-subdued">
                  <strong>{t('LabelSupportedFileTypes')}:</strong> {supFileTypes}
                </p>
              </div>
            </Alert>
          )}
          {uploadItems.map((item, index) => (
            <div
              key={index}
              className="relative my-6 flex w-full flex-col gap-1 rounded-md border border-border px-2 py-4 shadow-lg md:px-6"
            >
              <>
                {!item.uploadComplete && !item.uploadFailed && (
                  <>
                    {item.isUploading && (
                      <LoadingIndicator label={'MessageUploading'}>
                        <ProgressIndicator progress={item.uploadProgress || 0} />
                        <p className="mt-2 text-center text-xs text-foreground-muted">
                          ({bytesPretty(item.uploadBytesLoaded || 0)}/{bytesPretty(item.uploadBytesTotal || 0)})
                        </p>
                      </LoadingIndicator>
                    )}
                    {item.isFetchingMetadata && <LoadingIndicator label="LabelFetchingMetadata" />}
                    {/* floating # on left */}
                    <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg">
                      <p className="text-base">{'#' + (index + 1)}</p>
                    </div>
                    {/* floating x on right */}
                    {!uploadProcessing && !item.isUploading && (
                      <IconBtn
                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full border border-white/10 bg-primary shadow-xl"
                        onClick={() => handleRemoveStagedItem(index)}
                      >
                        <X size={16} />
                      </IconBtn>
                    )}
                    {item.metadataError && (
                      <Alert type="error" autoFocus={false}>
                        <p>{item.metadataError}</p>
                      </Alert>
                    )}
                    <div className="-mx-2 mb-4 flex flex-wrap items-center">
                      <div className="w-full p-2 md:w-1/2">
                        <label htmlFor="" className="mb-1 px-1 text-sm">
                          {t('LabelTitle')}
                        </label>
                        <TextInput
                          value={item.title}
                          onChange={(value) => handleItemPropertyChange(index, 'title', value)}
                        />
                      </div>
                      {currentLibraryMediaType === 'book' && (
                        <div className="w-full p-2 md:w-1/2">
                          <div className="flex items-end">
                            <div className="w-full pe-2">
                              <label htmlFor="" className="mb-1 px-1 text-sm">
                                {t('LabelAuthor')}
                              </label>
                              <TextInput
                                value={item.author}
                                onChange={(value) => handleItemPropertyChange(index, 'author', value)}
                              />
                            </div>
                            <Tooltip text={t('LabelUploaderItemFetchMetadataHelp')}>
                              <IconBtn onClick={() => handleFetchMetadata(index)} icon={RefreshCw} />
                            </Tooltip>
                          </div>
                        </div>
                      )}

                      {currentLibraryMediaType === 'book' && (
                        <div className="w-full p-2 md:w-1/2">
                          <label htmlFor="" className="mb-1 px-1 text-sm">
                            {t('LabelUploaderItemSeriesLabel')}
                          </label>
                          <TextInput
                            value={item.series}
                            onChange={(value) => handleItemPropertyChange(index, 'series', value)}
                          />
                        </div>
                      )}

                      <div className="w-full p-2 md:w-1/2">
                        <label htmlFor="" className="mb-1 px-1 text-sm">
                          {t('LabelUploaderItemDirectory')}
                        </label>
                        <TextInput readOnly={true} value={getDirectory(item)} />
                      </div>
                    </div>
                    <CollapsibleTable
                      title={t('HeaderItemFiles')}
                      count={item.itemFiles.length}
                      expanded={expandedTables[`${index}-itemFiles`] || false}
                      onExpandedChange={() => toggleTableExpanded(index, 'itemFiles')}
                      tableHeaders={tableHeaders}
                    >
                      {item.itemFiles.map((file) => (
                        <TableRow key={file.name} className="text-left">
                          <td>
                            <p className="pl-2">{file.name}</p>
                          </td>
                          <td>
                            <p>{bytesPretty(file.size)}</p>
                          </td>
                          <td>
                            <p>{file.filetype}</p>
                          </td>
                        </TableRow>
                      ))}
                    </CollapsibleTable>
                    {item.otherFiles.length > 0 && (
                      <CollapsibleTable
                        title={t('HeaderOtherFiles')}
                        count={item.otherFiles.length}
                        expanded={expandedTables[`${index}-otherFiles`] || false}
                        onExpandedChange={() => toggleTableExpanded(index, 'otherFiles')}
                        tableHeaders={tableHeaders}
                      >
                        {item.otherFiles.map((file) => (
                          <TableRow key={file.name} className="text-left">
                            <td>
                              <p className="pl-2">{file.name}</p>
                            </td>
                            <td>
                              <p>{bytesPretty(file.size)}</p>
                            </td>
                            <td>
                              <p>{file.filetype}</p>
                            </td>
                          </TableRow>
                        ))}
                      </CollapsibleTable>
                    )}
                  </>
                )}
                {item.uploadComplete && (
                  <Alert type="success" autoFocus={false}>
                    <p>{t('MessageUploaderItemSuccess')}</p>
                  </Alert>
                )}
                {item.uploadFailed && (
                  <Alert type="error" autoFocus={false}>
                    <p>{t('MessageUploaderItemFailed')}</p>
                    {item.uploadError && <p className="mt-1 text-xs opacity-75">{item.uploadError}</p>}
                  </Alert>
                )}
              </>
            </div>
          ))}
          {uploadItems.length > 0 && !uploadFinished && (
            <div className="flex w-full justify-end">
              <Btn disabled={uploadProcessing} color="bg-success" onClick={handleStartUpload}>
                {t('ButtonUpload')}
              </Btn>
            </div>
          )}
        </>
      )}
    </div>
  )
}
