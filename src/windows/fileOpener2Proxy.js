    function FileOpener2() {
    }

    FileOpener2.prototype.__schemes = function () {
        return [
            { protocol: 'ms-app', getFile: this.__getFileFromApplicationUri },
            { protocol: 'cdvfile', getFile: this.__getFileFromFileUri }    //protocol cdvfile
        ]
    };

    FileOpener2.prototype.__nthIndex = function(str, pat, n) {
	    var L = str.length, i = -1;
	    while (n-- && i++ < L) {
	        i = str.indexOf(pat, i);
	        if (i < 0) break;
	    }
	    return i;
	}

    FileOpener2.prototype.__getFileFromApplicationUri = function(uri) {
	    /* bad path from a file entry due to the last '//' 
               example: ms-appdata:///local//path/to/file
            */
	    var index = this.__nthIndex(uri, "//", 3);
	    var newUri = uri.substr(0, index) + uri.substr(index + 1);

	    var applicationUri = new Windows.Foundation.Uri(newUri);

	    return Windows.Storage.StorageFile.getFileFromApplicationUriAsync(applicationUri);
	}

    FileOpener2.prototype.__getFileFromFileUri = function(uri) {
	    /* uri example:
               cdvfile://localhost/persistent|temporary|another-fs-root/path/to/file
            */
        var indexFrom = this.__nthIndex(uri, "/", 3) + 1;
        var indexTo = this.__nthIndex(uri, "/", 4);
	    var whichFolder = uri.substring(indexFrom, indexTo);
	    var filePath = uri.substr(indexTo + 1);
	    var path = "\\" + filePath;

	    if (whichFolder == "persistent") {
	        path = Windows.Storage.ApplicationData.current.localFolder.path + path;
	    }
	    else {  //temporary, note: no roaming management
	        path = Windows.Storage.ApplicationData.current.temporaryFolder.path + path;
	    }

	    return this.__getFileFromNativePath(path);
	}

    FileOpener2.prototype.__getFileFromNativePath = function(path) {
	    var nativePath = path.split("/").join("\\");

	    return Windows.Storage.StorageFile.getFileFromPathAsync(nativePath);
	}

    FileOpener2.prototype.__getFileLoaderForScheme = function(path) {
        var fileLoader = this.__getFileFromNativePath;

	    this.__schemes().some(function (scheme) {
	        return path.indexOf(scheme.protocol) === 0 ? ((fileLoader = scheme.getFile.bind(this)), true) : false;
	    }.bind(this));

	    return fileLoader;
	}

    FileOpener2.prototype.open = function (path, mimeType, callbacks) {

        var getFile = this.__getFileLoaderForScheme(path);

        getFile(path).then(function (file) {
            var options = new Windows.System.LauncherOptions();

            Windows.System.Launcher.launchFileAsync(file, options).then(function (success) {
                callbacks.success();
            }, function (error) {
                callbacks.error(error);
            });

        }, function (error) {
            console.log("Error while opening the file: " + error);
            callbacks.error(error);
        });
    };

    FileOpener2.prototype.install = function () {
        if (!cordova.plugins) {
            cordova.plugins = {};
        }
        cordova.plugins.fileOpener2 = new FileOpener2();
        return cordova.plugins.fileOpener2;
    };

    cordova.addConstructor(FileOpener2.prototype.install);
    cordova.commandProxy.add("FileOpener2", FileOpener2);