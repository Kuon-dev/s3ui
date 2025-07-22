// Type definitions for i18n messages
// This ensures type safety when using translations

export interface Messages {
  common: {
    cancel: string;
    delete: string;
    rename: string;
    create: string;
    save: string;
    close: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    retry: string;
    download: string;
    upload: string;
    preview: string;
    copy: string;
    cut: string;
    paste: string;
    clear: string;
    done: string;
    name: string;
    size: string;
    date: string;
    type: string;
    modified: string;
    folder: string;
    file: string;
    folders: string;
    files: string;
    home: string;
    settings: string;
    navigate: string;
    open: string;
  };
  fileBrowser: {
    uploadButton: string;
    newFolderButton: string;
    pasteButton: string;
    deleteButton: string;
    clearButton: string;
    globalButton: string;
    settingsButton: string;
    goToHome: string;
    searchAllFolders: string;
    refreshFolder: string;
    sortByTooltip: string;
    uploadFilesTooltip: string;
    createFolderTooltip: string;
    moveOrCopyTooltip: string;
    deleteItemsTooltip: string;
    openSettingsTooltip: string;
    downloadTooltip: string;
    moreActionsTooltip: string;
    searchPlaceholder: string;
    loadingFiles: string;
    itemsSelected: string;
    itemsCount: string;
    foldersCount: string;
    filesCount: string;
    totalSize: string;
    parentFolder: string;
    sortByName: string;
    sortBySize: string;
    sortByDate: string;
    sortByType: string;
    sortAscending: string;
    sortDescending: string;
    fileConflicts: string;
    conflictsMessage: string;
    conflictsQuestion: string;
    skipConflicts: string;
    replaceAll: string;
  };
  emptyState: {
    folderEmpty: string;
    dragDropHint: string;
    uploadFiles: string;
    noResults: string;
    noResultsMessage: string;
    noResultsHint: string;
    clearSearch: string;
    errorTitle: string;
    errorMessage: string;
    retry: string;
  };
  renameDialog: {
    title: string;
    newNameLabel: string;
    placeholder: string;
    currentName: string;
    renaming: string;
    emptyNameError: string;
    nameRequiredError: string;
  };
  createFolderDialog: {
    title: string;
    folderNameLabel: string;
    placeholder: string;
    createIn: string;
    creating: string;
    createButton: string;
  };
  deleteDialog: {
    title: string;
    cannotUndo: string;
    folderWarning: string;
    folderDescription: string;
    fileDescription: string;
    deleting: string;
  };
  uploadDialog: {
    title: string;
    uploadingTo: string;
    uploadingToHome: string;
    dropFiles: string;
    dragDropFiles: string;
    browseComputer: string;
    maxFiles: string;
    maxSize: string;
    selectedFiles: string;
    clearAll: string;
    totalProgress: string;
    percentComplete: string;
    uploading: string;
    loadingPreview: string;
  };
  globalSearch: {
    placeholder: string;
    searching: string;
    noResultsFor: string;
    foldersCount: string;
    typeCount: string;
    recentSearches: string;
    resultsCount: string;
  };
  filePreview: {
    loading: string;
    error: string;
    downloadFile: string;
    textDocument: string;
    characterCount: string;
    notAvailable: string;
    cannotPreview: string;
    pdfDocument: string;
    audioNotSupported: string;
    videoNotSupported: string;
    previewLimited: string;
  };
  settings: {
    title: string;
    theme: string;
    appearance: string;
    fileDisplay: string;
    behavior: string;
    searchPlaceholder: string;
    resetAll: string;
    customizeExperience: string;
    shortcutHint: string;
    autoSave: string;
    interfaceDensity: string;
    densityDescription: string;
    compact: string;
    compactDescription: string;
    default: string;
    defaultDescription: string;
    spacious: string;
    spaciousDescription: string;
    showHiddenFiles: string;
    hiddenFilesDescription: string;
    showThumbnails: string;
    thumbnailsDescription: string;
    thumbnailSize: string;
    behaviorSettings: string;
    behaviorComingSoon: string;
    language: string;
    languageDescription: string;
  };
  errors: {
    loadFiles: string;
    loadFilesGeneric: string;
    loadFolderTree: string;
    loadFolderTreeGeneric: string;
    operationInProgress: string;
    cannotPerformOperation: string;
    deleteFailed: string;
    moveFailed: string;
    renameFailed: string;
    folderNameEmpty: string;
    anotherOperationInProgress: string;
    createFolderFailed: string;
    pasteFailed: string;
    cannotMoveToLocation: string;
    folderDoesNotExist: string;
    verifyFolderFailed: string;
    itemAlreadyExists: string;
  };
  success: {
    deleted: string;
    moved: string;
    renamed: string;
    folderCreated: string;
    copiedToClipboard: string;
    pasted: string;
    movedItem: string;
    settingsReset: string;
    settingsResetDescription: string;
    filesUploaded: string;
  };
  info: {
    itemsAlreadyInLocation: string;
    movingItems: string;
    uploadingFile: string;
  };
}

// Type for translation functions with parameter support
export type TranslationFunction = (key: string, values?: Record<string, any>) => string;

// Helper type to extract keys from nested objects
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & string];

// All available translation keys
export type TranslationKey = NestedKeyOf<Messages>;