declare namespace jsb {
    export class FileUtils {
        static getInstance(): FileUtils;
        static destroyInstance(): void;
        static setDelegate(delegate: FileUtils): void;

        purgeCachedEntries(): void;
        getStringFromFile(filename: string): string;
        getDataFromFile(filename: string): Object;
        getFileDataFromZip(zipFilePath: string, filename: string, size: number): Object;

        fullPathForFilename(filename: string): string;

        fullPathFromRelativeFile(filename: string, relativeFile: string): string;

        getWritablePath(): string;
        setWritablePath(writablePath: string);

        writeStringToFile(dataStr: string, fullPath: string): boolean;
        writeDataToFile(Object: any, fullPath: string): boolean;

        /**
         *  Gets the array of search paths.
         *
         *  @return The array of search paths.
         *  @see fullPathForFilename(const char*).
         *  @lua NA
         */
        getSearchPaths(): string[];
        /**
         *  Sets the array of search paths.
         *
         *  You can use this array to modify the search path of the resources.
         *  If you want to use "themes" or search resources in the "cache", you can do it easily by adding new entries in this array.
         *
         *  @note This method could access relative path and absolute path.
         *        If the relative path was passed to the vector, FileUtils will add the default resource directory before the relative path.
         *        For instance:
         *            On Android, the default resource root path is "assets/".
         *            If "/mnt/sdcard/" and "resources-large" were set to the search paths vector,
         *            "resources-large" will be converted to "assets/resources-large" since it was a relative path.
         *
         *  @param searchPaths The array contains search paths.
         *  @see fullPathForFilename(const char*)
         *  @since v2.1
         *  In js:var setSearchPaths(var jsval);
         *  @lua NA
         */
        setSearchPaths(searchPaths: string[]);
        /**
         * Set default resource root path.
         */
        setDefaultResourceRootPath(path: string);
        /**
         * Add search path.
         *
         * @since v2.1
         * 
         * 默认front = false
         */
        addSearchPath(path: string, front?: boolean);
        /**
         *  Checks whether a file exists.
         *
         *  @note If a relative path was passed in, it will be inserted a default root path at the beginning.
         *  @param filename The path of the file, it could be a relative or absolute path.
         *  @return True if the file exists, false if not.
         */
        isFileExist(filePath: string): boolean;
        /**
         *  Gets filename extension is a suffix (separated from the base filename by a dot) in lower case.
         *  Examples of filename extensions are .png, .jpeg, .exe, .dmg and .txt.
         *  @param filePath The path of the file, it could be a relative or absolute path.
         *  @return suffix for filename in lower case or empty if a dot not found.
         */
        getFileExtension(filePath: string): string;

        /**
         *  Checks whether the path is an absolute path.
         *
         *  @note On Android, if the parameter passed in is relative to "assets/", this method will treat it as an absolute path.
         *        Also on Blackberry, path starts with "app/native/Resources/" is treated as an absolute path.
         *
         *  @param path The path that needs to be checked.
         *  @return True if it's an absolute path, false if not.
         */
        isAbsolutePath(path: string): boolean;

        /**
         *  Checks whether the path is a directory.
         *
         *  @param dirPath The path of the directory, it could be a relative or an absolute path.
         *  @return True if the directory exists, false if not.
         */
        isDirectoryExist(dirPath: string): boolean;

        /**
         *  List all files in a directory.
         *
         *  @param dirPath The path of the directory, it could be a relative or an absolute path.
         *  @return File paths in a string vector
         */
        listFiles(dirPath: string): string[];

        /**
         *  Creates a directory.
         *
         *  @param dirPath The path of the directory, it must be an absolute path.
         *  @return True if the directory have been created successfully, false if not.
         */
        createDirectory(dirPath: string): boolean;
        /**
         *  Removes a directory.
         *
         *  @param dirPath  The full path of the directory, it must be an absolute path.
         *  @return True if the directory have been removed successfully, false if not.
         */
        removeDirectory(dirPath: string): boolean;

        /**
         *  Removes a file.
         *
         *  @param filepath The full path of the file, it must be an absolute path.
         *  @return True if the file have been removed successfully, false if not.
         */
        removeFile(filepath: string): boolean;

        /**
         *  Renames a file under the given directory.
         *
         *  @param path     The parent directory path of the file, it must be an absolute path.
         *  @param oldname  The current name of the file.
         *  @param name     The new name of the file.
         *  @return True if the file have been renamed successfully, false if not.
         */
        renameFile(path: string, oldname: string, name: string): boolean;

        /**
         *  Renames a file under the given directory.
         *
         *  @param oldfullpath  The current fullpath of the file. Includes path and name.
         *  @param newfullpath  The new fullpath of the file. Includes path and name.
         *  @return True if the file have been renamed successfully, false if not.
         */
        renameFile(oldfullpath: string, newfullpath: string): boolean;
        /**
         *  Retrieve the file size.
         *
         *  @note If a relative path was passed in, it will be inserted a default root path at the beginning.
         *  @param filepath The path of the file, it could be a relative or absolute path.
         *  @return The file size.
         */
        getFileSize(filepath: string): number;
    }

    export let fileUtils: FileUtils;

    export class Manifest {
        constructor(content: string, manifestRoot: string);

        isVersionLoaded(): boolean;
        isLoaded(): boolean;
        getPackageUrl(): string;
        getManifestFileUrl(): string;
        getVersionFileUrl(): string;
        getVersion(): string;
        getSearchPaths(): string[];
        getManifestRoot(): string;

        parseFile(manifestUrl: string): void;
        parseJSONString(content: string, manifestRoot: string): void;

        isUpdating(): boolean;
        setUpdating(updating: boolean): void;
    }

    export module AssetsManager {
        export enum State {
            UNINITED,
            UNCHECKED,
            PREDOWNLOAD_VERSION,
            DOWNLOADING_VERSION,
            VERSION_LOADED,
            PREDOWNLOAD_MANIFEST,
            DOWNLOADING_MANIFEST,
            MANIFEST_LOADED,
            NEED_UPDATE,
            READY_TO_UPDATE,
            UPDATING,
            UNZIPPING,
            UP_TO_DATE,
            FAIL_TO_UPDATE
        }
    }

    export class AssetsManager {
        constructor(manifestUrl: string, storagePath: string);

        setVersionCompareHandle(VersionCompareHandle: (versionA: string, versionB: string) => void): void;
        setVerifyCallback(VerifyCallback: (path: string, asset: { md5: string, size: number, path: string, compressed: boolean }) => void): void;
        setMaxConcurrentTask(max: number): void;
        getLocalManifest(): Manifest;
        retain(): void;
        release(): void;

        getState(): jsb.AssetsManager.State;

        /** @brief Load a custom local manifest object, the local manifest must be loaded already.
         * You can only manually load local manifest when the update state is UNCHECKED, it will fail once the update process is began.
         * This API will do the following things:
         * 1. Reset storage path
         * 2. Set local storage
         * 3. Search for cached manifest and compare with the local manifest
         * 4. Init temporary manifest and remote manifest
         * If successfully load the given local manifest and inited other manifests, it will return true, otherwise it will return false
         * @param localManifest    The local manifest object to be set
         * @param storagePath    The local storage path
         */
        loadLocalManifest(localManifest: Manifest, storagePath: string): boolean;

        /** @brief Load a local manifest from url.
         * You can only manually load local manifest when the update state is UNCHECKED, it will fail once the update process is began.
         * This API will do the following things:
         * 1. Reset storage path
         * 2. Set local storage
         * 3. Search for cached manifest and compare with the local manifest
         * 4. Init temporary manifest and remote manifest
         * If successfully load the given local manifest and inited other manifests, it will return true, otherwise it will return false
         * @param manifestUrl    The local manifest url
         */
        loadLocalManifest(manifestUrl: string): boolean;

        checkUpdate(): void;

        /** @brief Prepare the update process, this will cleanup download process flags, fill up download units with temporary manifest or remote manifest
         */
        prepareUpdate(): void;

        /** @brief Update with the current local manifest.
         */
        update(): void;

        /** @brief Reupdate all failed assets under the current AssetsManagerEx context
         */
        downloadFailedAssets(): void;
    }

    export class EventAssetsManager {
        static ERROR_NO_LOCAL_MANIFEST: number;// = 0;
        static ERROR_DOWNLOAD_MANIFEST: number;// = 1;
        static ERROR_PARSE_MANIFEST: number;// = 2;
        static NEW_VERSION_FOUND: number;// = 3;
        static ALREADY_UP_TO_DATE: number;// = 4;
        static UPDATE_PROGRESSION: number;// = 5;
        static ASSET_UPDATED: number;// = 6;
        static ERROR_UPDATING: number;// = 7;
        static UPDATE_FINISHED: number;// = 8;
        static UPDATE_FAILED: number;// = 9;
        static ERROR_DECOMPRESS: number;// = 10;

        getEventCode(): number;
        getMessage(): string;
        getAssetId(): string;

        isResuming(): boolean;

        getPercent(): number;

        getPercentByFile(): number;

        getDownloadedBytes(): number;

        getTotalBytes(): number;

        getDownloadedFiles(): number;

        getTotalFiles(): number;
    }

    export class EventListenerAssetsManager {
        constructor(assetsManager: AssetsManager, callback: Function);
    }

    class Reflection {
        // 调用原生静态方法
        callStaticMethod: (className: string, methodName: string, ...parameters: any[]) => any;
    }

    export let reflection: Reflection;
}