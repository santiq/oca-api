'use strict';
const fetch = require('node-fetch');
const parseXML = require('xml2js').parseString;
const { get } = require('lodash');

const baseURL = 'http://webservice.oca.com.ar/epak_tracking/Oep_TrackEPak.asmx';

const parseResponse = result => {
  if (!result.ok) {
    return result.text().then(error => {
      throw new Error(error);
    });
  }
  return result.text().then(xmlResult => new Promise((resolve, reject) => {
    parseXML(xmlResult, (err, json) => {
      if (err) {
        return reject(err);
      }
      return resolve(json);
    });
  }));
};

const getDataFromResponse = json => get(json, 'DataSet.diffgr:diffgram[0].NewDataSet[0].Table', []);

/**
 * Retorna envios generados en un determinado rango de fechas por un cliente.
 * @function
 * @param {string} $0.cuit - Numero de cuit.
 * @param {string} $0.fechaDesde - Formato DD/MM/AAAA.
 * @param {string} $0.fechaHasta - Formato DD/MM/AAAA.
 * @returns {array}
 * @example
 *    listEnvios({
 *      cuit: '30-71448151-3',
 *      fechaDesde:'02/06/2016',
 *      fechaHasta: '03/06/2016'
 *    }).then(a => console.log(a));
 */
const listEnvios = ({ cuit, fechaDesde, fechaHasta }) => {
  const URL = `${baseURL}/List_Envios`;
  const params = `cuit=${cuit}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
  return fetch(`${URL}?${params}`)
    .then(parseResponse)
    .then(getDataFromResponse)
    .then(list => list.map(elem => (
      { nroProducto: elem.NroProducto[0], numeroEnvio: elem.NumeroEnvio[0] })
    ))
    .catch(err => { throw new Error(err); });
};

/**
 * Retorna el costo de envio, tiempos de entrega y otros detalles
 * @function
 * @param {string} $0.operativa - Numero de operativa.
 * @param {string} $0.cuit - Numero de CUIT.
 * @param {string} $0.pesoTotal - Peso del envio en Kilos.
 * @param {string} $0.volumenTotal - Volumen del envio.
 * @param {string} $0.codigoPostalOrigen - Codigo Postal localidad de origen.
 * @param {string} $0.codigoPostalDestino - Codigo Postal localidad de destino.
 * @param {string} $0.cantidadPaquetes - Cantidad de paquetes.
 * @param {string} $0.valorDeclarado - Valor declarado.
 * @returns {array}
 * @example
 *    tarifarEnvioCorporativo({
 *      cuit: '27-16321016-4',
 *      pesoTotal: '3.5',
 *      volumenTotal: '2',
 *      codigoPostalOrigen: '2000',
 *      codigoPostalDestino: '2000',
 *      cantidadPaquetes: '5',
 *      valorDeclarado: '100',
 *      operativa: '63082',
 *    }).then(a => console.log(a))
 */
const tarifarEnvioCorporativo = ({ operativa, cuit, pesoTotal, volumenTotal, codigoPostalOrigen, codigoPostalDestino, cantidadPaquetes, valorDeclarado }) => {
  const URL = `${baseURL}/Tarifar_Envio_Corporativo`;
  const params = `cuit=${cuit}&operativa=${operativa}&pesoTotal=${pesoTotal}&volumenTotal=${volumenTotal}&codigoPostalOrigen=${codigoPostalOrigen}&codigoPostalDestino=${codigoPostalDestino}&cantidadPaquetes=${cantidadPaquetes}&valorDeclarado=${valorDeclarado}`;
  return fetch(`${URL}?${params}`)
    .then(parseResponse)
    .then(getDataFromResponse)
    .then(list => (
      list.map(elem => {
        const { Tarifador, Precio, idTiposervicio, Ambito, PlazoEntrega, Adicional, Total } = elem;
        return {
          tarifador: Tarifador[0],
          precio: Precio[0],
          idTiposervicio: idTiposervicio[0],
          ambito: Ambito[0],
          plazoEntrega: PlazoEntrega[0],
          adicional: Adicional[0],
          total: Total[0],
        };
      })
    ))
    .catch(err => { throw new Error(err); });
};

/**
 * Retorna el listado de provincias.
 * @function
 * @returns {array}
 * @example
 *    getProvincias()
 *     .then(a=>console.log(a))
 */
const getProvincias = () => {
  const URL = `${baseURL}/GetProvincias`;
  return fetch(URL)
    .then(parseResponse)
    .then(getDataFromResponse)
    .then(list => (
      list.map(elem => {
        const { IdProvincia, Descripcion } = elem;
        return {
          idProvincia: IdProvincia[0],
          descripcion: Descripcion[0].trim(),
        };
      })
    ))
    .catch(err => { throw new Error(err); });
};

/**
 * Retorna un listado con las localidades que tiene una provincia.
 * @function
 * @param {string} $0.idProvincia - ID de la provincia.
 * @returns {array}
 * @example
 *   getLocalidadesByProvincia({ idProvincia: 1 })
 *     .then(a => console.log(a))
 */
const getLocalidadesByProvincia = ({ idProvincia }) => {
  const URL = 'http://webservice.oca.com.ar/oep_tracking/Oep_Track.asmx/GetLocalidadesByProvincia';
  const params = `idProvincia=${idProvincia}`;
  return fetch(`${URL}?${params}`)
    .then(parseResponse)
    .then(json => {
      const Localidades = json.Localidades.Provincia.map(place => place.Nombre[0]);
      return Localidades;
    })
    .catch(err => { throw new Error(err); });
};

/**
 * Retorna el historial de tracking de una pieza. Si se indica el
 * Numeroro de Pieza no es necesario indicar Numero de Documento del Cliente ni tampoco CUIT. Caso
 * contrario, estos dos últimos son obligatorios.
 * @function
 * @param {string} $0.pieza - Numero de pieza.
 * @param {string} $0.nroDocumentoCliente - Numero de Documento del Cliente.
 * @param {string} $0.cuit - Numero de CUIT.
 * @returns {array}
 * @example
 *   trackingPieza({ pieza: '4610700000000000648' })
 *     .then(a => console.log(a))
 */
const trackingPieza = ({ pieza, nroDocumentoCliente = '0', cuit = '0' }) => {
  const URL = `${baseURL}/Tracking_Pieza`;
  const params = `pieza=${pieza}&nroDocumentoCliente=${nroDocumentoCliente}&cuit=${cuit}`;
  return fetch(`${URL}?${params}`)
    .then(parseResponse)
    .then(getDataFromResponse)
    .then(list => list.map(elem => {
      const { NumeroEnvio, Descripcion_Motivo, Desdcripcion_Estado, SUC, fecha } = elem;
      return {
        numeroEnvio: NumeroEnvio[0],
        descripcion_Motivo: Descripcion_Motivo[0],
        desdcripcion_Estado: Desdcripcion_Estado[0],
        suc: SUC[0],
        fecha: fecha[0],
      };
    }))
    .catch(err => { throw new Error(err); });
};

module.exports = {
  listEnvios,
  tarifarEnvioCorporativo,
  getProvincias,
  getLocalidadesByProvincia,
  trackingPieza,
};
