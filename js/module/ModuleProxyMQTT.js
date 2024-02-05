class PublishQueue {
    constructor(capacity, delay) {
        this._Queue = [];
        this._Capacity = capacity;
        this._Delay = delay || 0;
        this._IsOnProcess = false;
    }
    /**
     * @method
     * @param {Function} task 
     */
    AddTask(task) {
        if (this._Queue.length < this._Capacity) this._Queue.unshift(task);
        else this._Queue[0] = task;

        if (!this._IsOnProcess) this.ProcessTask();
    }

    ProcessTask() {
        this._IsOnProcess = true;
        let t = this._Queue.pop();
        t();
        console.log(t.name);
 
        setTimeout(() => {
            this._IsOnProcess = false;  
            if (this._Queue.length) this.ProcessTask();
        }, this._Delay);
    }
}
class PublishQueue {
    constructor(capacity) {
        this._Queue = [];
        this._Capacity = capacity;
    }
    /**
     * @typedef {Object} TypeBufferizedMsg
     * @prop {string} topicName
     * @prop {any} msg
     */
    /**
     * @method
     * 
     * @param {TypeBufferizedMsg} msg 
     */
    Push(msg) {
        let i = this._Queue.findIndex(pub => pub.topicName === msg.topicName);
        if (i !== -1) this._Queue[i] = msg;
        else {
            if (this._Queue.length >= this._Capacity) this._Queue[0] = msg;     //если очередь уже заполнена, то сообщение на 0-вой позиции затирается
            else this._Queue.push(msg);
        }
    }
}

/**
 * @class является придатком WS Server и реализует передачу и обработку запросов и сообщений 
 * как со стороны WS Server (сверху), так и со стороны RouteREPL, SensorManager, Control (снизу). 
 * Экземпляр класса инициализируется как поле класса WS Server при успешном создании последнего.
 */
class ProxyMQTT {
    /**
     * @constructor
     * @param {ClassMQTT} _mqtt - MQTT Server(publisher) object
     */
    constructor(_mqtt) {
        this._MQTT = _mqtt;
        // this._SubID = {}; //{'MAS-1000': 'hfehklvhelv'}  
        this._Subs = {};    
        this._BandWidth = undefined;

        this._PublishQueue = new PublishQueue(10, 20);

        /************************************* SUB EVENTS **********************************/
        Object.on('sensor-sub', (channelId, topicName) => {
            this._Subs.sensor[channelId] = topicName;
        });   

        /************************************* READ EVENTS **********************************/
        /**
         * @typedef {Object} SMMessage
         * @property {string} MetaData
         * @property {[Object]} Value 
         */
        /**
         * @event
         * Событие перехватывает и обрабатывает все сообщения от SensorManager
         * @param {SMMessage} msg
         */
        Object.on('sensor-read', msg => {
            if (msg.MetaData === 'Data') {
                msg.Value
                    .filter(channel_data => this._Subs.sensor[channel_data.ID]) // данные с каналов, на которые нет подписки, откидываются
                    .forEach(channel_data => {
                        let topic_name = this._Subs.sensor[channel_data.ID];
                        // this.Send(channel_data.Value, topicName);
                        this._PublishQueue.AddTask(() => { this.Send(this.Send(channel_data.Value, topic_name))})
                    });
            } 
        });
    }
    /**
     * @typedef {Object} TypeSubsObj
     * @prop {Object} sensor - объект, хранящий информацию о подписках на сенсоры
     * @prop {Object} process
     */
    /*Example: { sensor: { channel_id1 : topic_name1, channel_id2: topic_name2 } }; */
    /**
     * @method
     * Принимает объект, хранящий коллекцию подписок под каждую службу 
     * @param {TypeSubsObj} _subsObj 
     */
    AddSubs(_subsObj) {
        let sensor_subs = _subsObj.sensor;
        // сохраняется ассоциация ID - название топика
        if (sensor_subs) Object.keys(sensor_subs).forEach(chId => {
            this._Subs[chId] = _subsObj[chId];
        });
    }
    /**
     * @method 
     * Удаление подписчиков из коллекции 
     * @param {TypeSubsObj} key 
     */
    RemoveSub(_subsObj) {
        let sensor_subs = _subsObj.sensor;
        // сохраняется ассоциация ID - название топика
        if (sensor_subs) Object.keys(sensor_subs).forEach(chId => {
            delete this._Subs[chId];
        });
    }
    /**
     * @method 
     * Вызывается извне (со стороны MQTT) для передачи команд
     * @param {String} _data - команда в виде JSON-строки
     */
    Receive(_data) {
        let command_obj = null;
        try {
            command_obj = JSON.parse(_data);
        } catch (e) {
            throw new err('Incorrect JSON data');
        }
        Object.emit(command_obj.com, command_obj.arg);
    }
    /**
     * @method
     * Отправляет сообщение в виде JSON-строки на WS Server
     * @param {String} data сообщение 
     */
    Send(data, topicName) { 
        // data.MetaData.CRC = E.CRC32(JSON.stringify(data)); //расчет чексуммы
        // this._MQTT.Notify(data);         //отправка на WS Server
    }
}
exports = ProxyMQTT;
