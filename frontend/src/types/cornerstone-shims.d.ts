/**
 * The dicom-image-loader package ships as a pre-bundled JS file without
 * TypeScript declarations. We only call a couple of runtime APIs (init +
 * image loading plumbing handled inside cornerstone-core) and deliberately
 * treat the module as `any` here to avoid spurious build failures.
 */
declare module '@cornerstonejs/dicom-image-loader'
