/**
 * @class является придатком WS Server и реализует передачу и обработку запросов и сообщений 
 * как со стороны WS Server (сверху), так и со стороны RouteREPL, SensorManager, Control (снизу). 
 * Экземляр класса инициализируется как поле класса WS Server при успешном создании последнего.
 */
class ProxyWS {
    /**
     * @constructor
     * @param {WS} _wss - WS Server
     */
    constructor(_wss) {
        this._WSS = _wss;
        this._SubID = {}; //{'MAS-1000': 'some-hash-key'} 
        // this._Subs = {};     

        /************************************* SUB EVENTS **********************************/
        Object.on('repl-sub', (id, key) => {
            this._WSS._Clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('repl')) client.RegServices.push('Repl');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });
        Object.on('sensor-sub', (id, key) => {
            this._WSS._Clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('sensor')) client.RegServices.push('Sensor');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });   
        Object.on('process-sub', (id, key) => {
            this._WSS._Clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('process')) client.RegServices.push('Process');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });
        /************************************* READ EVENTS **********************************/
        Object.on('repl-read', msg => {         //обработка события repl-read перехватом сообщения от REPL 
            let data = this.LHPifyReplMsg(msg);
            this.Send(data);   
        });

        Object.on('sensor-data', data => {

            Object.keys(data).forEach(channelID => {
                this.Send(this.LHPifySensorData(channelID, data[channelID]));
            });
        });

        Object.on('sensor-info', infoArr => {
            infoArr.forEach(sensorInfo => {
                this.Send(this.LHPifySensorInfo(sensorInfo));
            });
        });

        Object.on('process-read', msg => {
            return;
        });
    }
    TestReceive(msg) {
        Object.emit(msg.com, msg.arg);
    }
    /**
     * @method 
     * Вызывается извне (со стороны WS) для передачи команд
     * @param {String} _data - JSON пакет с командами в виде строки
     * @param {String} _key - ключ с которым WSS ассоциирует отправителя
     */
    Receive(_data, _key) {
        let obj = null;
        try {
            obj = JSON.parse(_data);
        } catch (e) {
            throw new err('Incorrect JSON data');
        }
        let key = _key;
        
        let meta_crc = obj.MetaData.CRC;    //чексумма, полученная из пакета
        delete obj.MetaData.CRC;

        let actual_crc = E.CRC32(JSON.stringify(obj));  //фактическая чексумма

        if (actual_crc === meta_crc) {  //если фактический CRC полученного пакета сходится с CRC зашитым в пакет

            let comObj = obj.MetaData.Command[0];   //первый объект { "com": 'String', "arg": [] }
            if (comObj.com.endsWith('sub') || comObj.com.endsWith('cm')) {
                Object.emit(comObj.com, obj.MetaData.ID, key);
            }
            else Object.emit(comObj.com, comObj.arg, obj.MetaData.ID);
        }
    }
    /**
     * @method
     * Отправляет сообщение в виде JSON-строки на WS Server
     * @param {String} data сообщение 
     */
    Send(data) { 
        data.MetaData.CRC = E.CRC32(JSON.stringify(data)); //расчет чексуммы
        this._WSS.Notify(data);         //отправка на WS Server
    }
    /**
     * @method 
     * Удаление подписчика из коллекции по ключу. Метод вызывается исключительно объектом WS
     * @param {String} key 
     */
    RemoveSub(key) {
        for (let k of this._SubID) {
            if (this._SubID[k] === key) delete this._SubID[k];
        };
        if (Object.keys(this._SubID).length === 0) Object.emit('repl-cm', 'EWI');
    }
    /**
     * @method
     * Метод формирует пакет из сообщения, полученного от REPL 
     * @param {String} msg 
     * @returns {Object}
     */
    LHPifyReplMsg(msg) {
        return ({
            "MetaData": {
                "Type": "controller",
                "ID": process.env.SERIAL,
                "TimeStamp2": getTime(),
                "Repl": {
                    "com":""
                },
                "RegServices": "Repl"
            },
            "Value": msg
        });
    }
    /**
     @typedef SensorInfo
     @property {string} ID,
     @property {string} _Name
     @property {string} _Type
     @property {string} _TypeOutSignal
     @property {string} _TypeInSignal
     @property {string} _ChannelNames
     @property {string} _NumPortsRequired
     @property {Number} _QuantityChannel     
     @property {string} _BusTypes    
     */
    /**
     * @method
     * Метод формирует с информацией о датчике из данных, полученных от SensorManager 
     * @param {SensorInfo} sensorInfo 
     * @returns 
     */
    LHPifySensorInfo(sensorInfo) {
        return ({
            "MetaData": {
                "Type": "controller",
                "ID": process.env.SERIAL,
                "TimeStamp2": getTime(),
                "Sensor": {
                    "com": "get-info",
                    "arg": []
                },
                "RegServices": "Sensor"
            },
            "Value": JSON.stringify(sensorInfo)
        });
    }
    /**
     * @typedef {Object} SensorData
     * @property {string} ID
     * @property {Number} Value 
     */
    /**
     * @method
     * Метод формирует пакет из данных, полученных от SensorManager
     * @param {SensorData} sensorData 
     */
    LHPifySensorData(id, value) {
        return ({
            "MetaData": {
                "Type": "controller",
                "ID": process.env.SERIAL,
                "TimeStamp2": getTime(),
                "Sensor": {
                    "ID": id,
                    "com": "start-polling",
                    "arg": []
                },
                "RegServices": "Sensor"
            },
            "Value": value
        });
    }
}
exports = ProxyWS;