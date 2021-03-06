import Scene from './components/Scene.js'
import State from './components/State.js'
import Thing from './components/Thing.js'
import UI from './components/ui'

export default class IferEngine {
  constructor (story) {
    // Parse Scenes
    this.scenes = {}
    for (let sceneUID in story.scenes) {
      if (story.scenes.hasOwnProperty(sceneUID)) {
        this.scenes[sceneUID] = new Scene(this, sceneUID, story.scenes[sceneUID])
      }
    }

    // Parse Things
    this.things = {}
    for (let thingUID in story.things) {
      if (story.things.hasOwnProperty(thingUID)) {
        this.things[thingUID] = new Thing(this, thingUID, story.things[thingUID])

        // If thing's definition contains scenes, add them to the scenes object
        if ('scenes' in story.things[thingUID]) {
          for (let sceneUID in story.things[thingUID].scenes) {
            if (story.scenes.hasOwnProperty(sceneUID)) {
              this.scenes[sceneUID] = new Scene(this, sceneUID, story.objects[thingUID].scenes[sceneUID])
            }
          }
        }
      }
    }

    // Create initial state
    this.state = new State(story.state)

    // Store global config
    this.config = story.config

    // Initiate some values
    this.scene = this.scenes[this.config.firstScene]
    this.ui = null

    // Root State flags
    this.flags = {
      mounted: false,
      started: false
    }
  }

  /*
   * -- System Methods --
   * These should be prefixed with a _
   */

  _mount (el) {
    this.ui = new UI(el)
    this.flags.mounted = true
  }

  _start () {
    if (this.flags.mounted) {
      this.ui.load(this.scene, this.state)
      this.flags.started = true
    } else {
      IferError.warn('Unmounted Story', 'You can\'t start an ifer instance before it\'s been mounted')
    }
  }

  _update (state) {
    this.state = state
  }

  /*
   * -- Story API actions --
   * These should NOT be prefixed with a _
   */

  get api () {
    let _ifer = this
    return {
      load (obj) {
        // obj { scene: Scene UID } //
        let scene = _ifer.scenes[obj.scene]
        if (scene) {
          if (_ifer.flags.mounted) {
            _ifer.ui.load(scene, _ifer.state)
          } else {
            IferError.warn('Unmounted Story', 'You can\'t start an ifer instance before it\'s been mounted')
          }
        } else {
          IferError.warn('Tried To Load Unregistered Scene', 'Could not find a scene with the UID `' + obj.scene + '`')
        }
      },
      loadIf (rules) {
        // rules [{ rule: Rule, scene: Scene UID }...] //
        let base = null
        for (let branch in rules) {
          if (typeof rules[branch].rule === 'object') {
            if (_ifer.state.test(rules[branch].rule)) {
              this.load({ 'scene': rules[branch].scene })
              return true
            }
          } else if (rules[branch].rule === 'otherwise') {
            base = rules[branch]
          }
        }

        if (base) {
          this.load({ 'scene': base.scene })
          return true
        } else {
          IferError.warn('No base on loadIf action', '')
          return false
        }
      },
      quit () {
        _ifer.ui.unload()
        _ifer.flags.started = false
        _ifer.flags.mounted = false
      }
    }
  }
}
