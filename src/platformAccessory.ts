import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from "homebridge"

import { BigAssPlatform } from "./platform"
import { BigAssFan } from "bigassfans"
import { Direction, OperatingMode } from "bigassfans/dist/proto/fan"

type Description = Awaited<ReturnType<typeof BigAssFan.discover>>[number]

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class BigAssAccessory {
  private fanService: Service | undefined
  private whooshService: Service | undefined
  private ecoService: Service | undefined
  private lightService: Service | undefined

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private interface: BigAssFan


  constructor(
    private readonly platform: BigAssPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    const description = accessory.context.description as Description
    this.interface = description.initialize()

    // set accessory information



    this.interface.on("ready", fan => {
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, "BigAssFans")
        .setCharacteristic(this.platform.Characteristic.Model, description.model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, description.deviceId)
        .getCharacteristic(this.platform.Characteristic.FirmwareRevision).onGet(() => fan.version.get())


      if (fan.hasFan()) {
        this.fanService = this.accessory.getService(this.platform.Service.Fanv2)
          || this.accessory.addService(this.platform.Service.Fanv2)

        this.fanService.setCharacteristic(this.platform.Characteristic.Name, description.name)

        // Power state characteristic
        this.fanService.getCharacteristic(this.platform.Characteristic.Active)
          .onSet(async value => {
            const c = this.platform.Characteristic.Active
            let newValue = await fan.fan.mode.set((value === c.ACTIVE) ? OperatingMode.On : OperatingMode.Off)
            return newValue
          })
          .onGet(async () => {
            const value = await fan.fan.mode.get()
            return value
          })

        this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
          .onSet(async value => {
            if (typeof value == "number") {
              let newValue = await fan.fan.speedPercent.set(Math.round(value))
              return newValue
            } else {
              throw new Error("RotationSpeed.onSet parameter is not of type number")
            }
          })
          .onGet(async () => {
            const value = await fan.fan.speedPercent.get()
            return value
          })

        this.fanService.getCharacteristic(this.platform.Characteristic.RotationDirection)
          .onSet(async value => {
            const c = this.platform.Characteristic.RotationDirection
            let newValue = await fan.fan.direction.set((value === c.COUNTER_CLOCKWISE) ? Direction.Forward : Direction.Reverse)
            return newValue
          })
          .onGet(async () => {
            const c = this.platform.Characteristic.RotationDirection
            const value = await fan.fan.direction.get()
            return (value === Direction.Forward) ? c.COUNTER_CLOCKWISE : c.CLOCKWISE
          })

        // Whoosh Toggle Switch
        this.whooshService = this.accessory.getService("Whoosh")
          || this.accessory.addService(this.platform.Service.Switch, "Whoosh", "fan-switch-1")
        this.whooshService.setCharacteristic(this.platform.Characteristic.Name, "Whoosh")
        this.whooshService.getCharacteristic(this.platform.Characteristic.On)
          .onSet(value => {
            return fan.fan.whoosh.set(value as boolean)
          })
          .onGet(() => {
            return fan.fan.whoosh.get()
          })

      }

      if (fan.hasLight()) {
        this.lightService = this.accessory.getService(this.platform.Service.Lightbulb)
          || this.accessory.addService(this.platform.Service.Lightbulb)

        this.lightService.getCharacteristic(this.platform.Characteristic.On)
          .onSet(value => {
            return fan.light.mode.set((value) ? OperatingMode.On : OperatingMode.Off)
          })
          .onGet(async () => {
            return (await fan.light.mode.get() === OperatingMode.On)
          })

        this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
          .onSet(value => {
            return fan.light.percent.set(value as number)
          })
          .onGet(() => {
            return fan.light.percent.get()
          })

        if (fan.hasColorTemperature()) {

          this.lightService.getCharacteristic(this.platform.Characteristic.ColorTemperature)
            .onSet(value => {
              return fan.light.temperature.set(value as number)
            })
            .onGet(() => {
              return fan.light.temperature.get()
            })

        }
      }

      if (fan.hasEco()) {
        // Eco Mode Toggle Switch
        this.ecoService = this.accessory.getService("Eco Mode")
          || this.accessory.addService(this.platform.Service.Switch, "Eco Mode", "fan-switch-2")
        this.ecoService.setCharacteristic(this.platform.Characteristic.Name, "Eco Mode")
        this.ecoService.getCharacteristic(this.platform.Characteristic.On)
          .onSet(value => {
            return fan.eco.set(value as boolean)
          })
          .onGet(() => {
            return fan.eco.get()
          })
      }

    })

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on("get")` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    //   let motionDetected = false
    //   setInterval(() => {
    //     // EXAMPLE - inverse the trigger
    //     motionDetected = !motionDetected

    //     // push the new value to HomeKit
    //     motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected)
    //     motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected)

    //     this.platform.log.debug("Triggering motionSensorOneService:", motionDetected)
    //     this.platform.log.debug("Triggering motionSensorTwoService:", !motionDetected)
    //   }, 10000)
    // }
  }
}