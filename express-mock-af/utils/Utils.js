const fs = require('fs');
const path = require('path');
const dir = require('node-dir');
const { chain, isEmpty } = require('lodash');
const { BehaviorSubject } = require('rxjs');


class Utils {
    static fileWritten$ = new BehaviorSubject('');

    static async writeToDisk(filepath, content) {
        return new Promise((resolve, reject) => {
            fs.mkdirSync(path.dirname(filepath), { recursive: true });
            fs.writeFile(filepath, content, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.fileWritten$.next(content);
                    resolve();
                }
            });
        });
    }

    /**
     * Read files from directory paths and return the content of the files in utf-8 format.
     *
     * @param directoryPathRoot
     * @returns {Promise<*|*[]>}
     */
    static async readFiles(directoryPathRoot) {
        try {
            const filePaths = await Utils.getDirectoriesRecursive(directoryPathRoot);
            return chain(filePaths)
                .map(path => {
                    const fileContent = fs.readFileSync(path, 'utf-8');
                    return fileContent ? fileContent : null;
                })
                .filter(content => !isEmpty(content))
                .value();
        } catch (error) {
            console.error(`Error reading files from ${directoryPathRoot}: ${error.message}`);
            return [];
        }
    }

    /**
     * Search for files in the given directory recursively.
     *
     * @param path
     * @returns {Promise<unknown>}
     */
    static async getDirectoriesRecursive(path) {
        return new Promise((resolve, reject) => {
            dir.readFiles(path, {
                    match: /\.xml$/
                },
                function (err, content, next) {
                    if (err) return reject(err);
                    next();
                },
                function (err, files) {
                    if (err) return reject(err);
                    resolve(files);
                });
        });
    }

    /**
     * Logically converts a regular expression range string to an array.
     * @param rangeString
     * @returns {*|*[]}
     */
    static regexRangeToArray(rangeString) {
        if (rangeString.includes(',')) {
            return rangeString.split(',');
        } else if (rangeString.includes('-')) {
            const [start, end] = rangeString.split('-');
            const result = [];
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
            return result;
        } else {
            return [rangeString];
        }
    }
}

module.exports = Utils;
