import { randomUUID as uuidv4 } from 'crypto';
import { ConverterAnyBase } from './converter-any-base';

const flickrBase58 =
  '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

function anyBase(srcAlphabet: string, dstAlphabet: string) {
  const converter = new ConverterAnyBase(srcAlphabet, dstAlphabet);
  return (number: number) => converter.convert(number);
}

anyBase.BIN = '01';
anyBase.OCT = '01234567';
anyBase.DEC = '0123456789';
anyBase.HEX = '0123456789abcdef';

const baseOptions = {
  consistentLength: true,
};

// A default generator, instantiated only if used.
let toFlickr: any;

/**
 * Takes a UUID, strips the dashes, and translates.
 * @param {string} longId
 * @param {function(string)} translator
 * @param {Object} [paddingParams]
 * @returns {string}
 */
const shortenUUID = (longId: string, translator: any, paddingParams: any) => {
  const translated = translator(longId.toLowerCase().replace(/-/g, ''));

  if (!paddingParams || !paddingParams.consistentLength) return translated;

  return translated.padStart(
    paddingParams.shortIdLength,
    paddingParams.paddingChar
  );
};

/**
 * Translate back to hex and turn back into UUID format, with dashes
 * @param {string} shortId
 * @param {function(string)} translator
 * @returns {string}
 */
const enlargeUUID = (shortId: string, translator: any) => {
  const uu1 = translator(shortId).padStart(32, '0');

  // Join the zero padding and the UUID and then slice it up with match
  const m = uu1.match(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/);

  // Accumulate the matches and join them.
  return [m[1], m[2], m[3], m[4], m[5]].join('-');
};

// Calculate length for the shortened ID
const getShortIdLength = (alphabetLength: number) =>
  Math.ceil(Math.log(2 ** 128) / Math.log(alphabetLength));

export function shortId() {
  const makeConvertor: any = (toAlphabet: string, options: any) => {
    // Default to Flickr 58
    const useAlphabet = toAlphabet || flickrBase58;

    // Default to baseOptions
    const selectedOptions = { ...baseOptions, ...options };

    // Check alphabet for duplicate entries
    if ([...new Set(Array.from(useAlphabet))].length !== useAlphabet.length) {
      throw new Error(
        'The provided Alphabet has duplicate characters resulting in unreliable results'
      );
    }

    const shortIdLength = getShortIdLength(useAlphabet.length);

    // Padding Params
    const paddingParams = {
      shortIdLength,
      consistentLength: selectedOptions.consistentLength,
      paddingChar: useAlphabet[0],
    };

    // UUIDs are in hex, so we translate to and from.
    const fromHex = anyBase(anyBase.HEX, useAlphabet);
    const toHex = anyBase(useAlphabet, anyBase.HEX);
    const generate = () => shortenUUID(uuidv4(), fromHex, paddingParams);

    const translator = {
      new: generate,
      generate,
      uuid: uuidv4,
      fromUUID: (uuid: string) => shortenUUID(uuid, fromHex, paddingParams),
      toUUID: (shortUuid: string) => enlargeUUID(shortUuid, toHex),
      alphabet: useAlphabet,
      maxLength: shortIdLength,
    };

    Object.freeze(translator);

    return translator;
  };

  // Expose the constants for other purposes.
  makeConvertor.constants = {
    flickrBase58,
  };

  // Expose the generic v4 UUID generator for convenience
  makeConvertor.uuid = uuidv4;

  // Provide a generic generator
  makeConvertor.generate = () => {
    if (!toFlickr) {
      // Generate on first use;
      toFlickr = makeConvertor(flickrBase58).generate;
    }
    return toFlickr();
  };

  return makeConvertor;
}
