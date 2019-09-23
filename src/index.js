import React, { PureComponent, createElement, createContext } from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { isJson, isObject, isEmpty } from '@crude/extras';

const FormContext = createContext('form');

/**
 * form flow
 * @param  {Object} options
 * @param  {Function} options.validate
 * @param  {Array} options.watch
 *
 */
const form = (options = {}) => (Comp) => {
  if (!isJson(options)) {
    throw TypeError('[form] options is object !');
  }

  const { watch = [] } = options;
  const supValidate = options.validate || function vd() {};

  if (typeof supValidate !== 'function') {
    throw TypeError('[form] options.validate is function !');
  }

  if (!Array.isArray(watch)) {
    throw TypeError('[form] options.watch is array !');
  }

  class Form extends PureComponent {
    constructor(props) {
      super(props);
      this._state = {
        _initials: {},
        _values: {},
        _validates: {},
        _errors: {},
        _register: [],
        _watch: watch,
      }; // buffer state

      this.state = {
        errors: {}, // render errors
        values: {}, // watch values
      };
      this.register = this.register.bind(this);
      this.unregister = this.unregister.bind(this);
      this.fieldChange = this.fieldChange.bind(this);
      this._validate = this._validate.bind(this);
      this.validate = this.validate.bind(this);
      this.getErrors = this.getErrors.bind(this);
      this.getFields = this.getFields.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.submit = this.submit.bind(this);
      this.watchField = this.watchField.bind(this);
      this.watchError = this.watchError.bind(this);
    }

    register(name, opts = {}) {
      const {
        _initials,
        _values,
        _validates,
        _register,
        _watch,
      } = this._state;

      if (_register.indexOf(name) === -1) {
        _register.push(name);
      }

      if (typeof opts.initial !== 'undefined') {
        _initials[name] = opts.initial;
        _values[name] = opts.initial;

        // handle watch
        if (_watch.indexOf(name) !== -1) {
          this.setState({
            values: {
              ...this.state.values,
              [name]: _values[name], // set initial value,
            },
          });
        }
      }

      if (typeof opts.validate === 'function') {
        _validates[name] = opts.validate;
      }

      this._validate();
    }

    unregister(name) {
      const { _register } = this._state;
      const idx = _register.indexOf(name);
      if (idx !== -1) {
        _register.splice(idx, 1);
      }
    }

    // updateState = debounce(this.setState, 300, false)

    fieldChange(name, value) {
      const { _values } = this._state;
      _values[name] = value;
      this._validate();

      const { values } = this.state;

      // watch value change
      if (this._state._watch.indexOf(name) !== -1) {
        this.setState({
          values: { ...values, [name]: value },
        });
      }
    }

    _validate() {
      const { _values, _validates } = this._state;

      let errors = supValidate(_values) || {};

      // each error check
      Object.keys(_validates).forEach((name) => {
        const err = _validates[name](_values) || {};
        errors = Object.assign(err, errors);
      });

      this._state._errors = errors;
    }

    validate(names) {
      const errors = this.getErrors(names);
      this.setState({ errors });
      return errors;
    }

    getErrors(names) {
      const errors = {};
      const { _errors, _register } = this._state;
      if (Array.isArray(names)) {
        names.forEach((name) => {
          if (_register.indexOf(name) !== -1 && _errors[name]) {
            errors[name] = _errors[name];
          }
        });
      } else {
        Object.keys(_errors).forEach((name) => {
          if (_register.indexOf(name) !== -1) {
            errors[name] = _errors[name];
          }
        });
      }
      return errors;
    }

    getFields(names) {
      const values = {};
      const { _values, _register } = this._state;
      if (Array.isArray(names)) {
        names.forEach((name) => {
          if (_register.indexOf(name) !== -1) {
            values[name] = _values[name];
          }
        });
      } else {
        Object.keys(_values).forEach((name) => {
          if (_register.indexOf(name) !== -1) {
            values[name] = _values[name];
          }
        });
      }
      return values;
    }

    handleSubmit(onSubmit) {
      function handle(e) {
        e.preventDefault();
        if (isEmpty(this.validate())) {
          onSubmit(this.getFields());
        }
      }
      return handle.bind(this);
    }

    submit(names) {
      function handle(onSubmit) {
        if (isEmpty(this.validate(names))) {
          onSubmit(this.getFields(names));
        }
      }
      return handle.bind(this);
    }

    watchField(name) {
      const { _watch, _values } = this._state;
      if (_watch.indexOf(name) === -1) {
        _watch.push(name);
      }
      return _values[name];
    }

    watchError(name) {
      const { _watch, _errors } = this._state;
      if (_watch.indexOf(name) === -1) {
        _watch.push(name);
      }
      return _errors[name];
    }

    render() {
      const context = {
        errors: this.state.errors,
        register: this.register,
        unregister: this.unregister,
        onChange: this.fieldChange,
      };

      const forms = {
        handleSubmit: this.handleSubmit,
        getFields: this.getFields,
        watchField: this.watchField,
        getErrors: this.getErrors,
        watchError: this.watchError,
        submit: this.submit,
        values: this.state.values,
      };

      return (
        <FormContext.Provider value={context}>
          <Comp {...this.props} forms={forms} />
        </FormContext.Provider>
      );
    }
  }

  Form.displayName = `Connect(${Comp.displayName || Comp.name || 'Comp'})`;

  return hoistNonReactStatics(Form, Comp);
};

class Field extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.handle(props.initial),
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    const { name, initial, validate } = this.props;
    this.context.register(name, {
      initial: this.props.handle(initial),
      validate,
    });
  }

  componentWillUnmount() {
    this.context.unregister(this.props.name);
  }

  onChange(e) {
    const value = isObject(e) && isObject(e.target)
      ? e.target.value
      : e;
    this.setState({ value: this.props.handle(value || '') }, () => {
      this.context.onChange(this.props.name, value);
    });
  }

  render() {
    const { name, component, ...props } = this.props;

    const inputProps = {
      onChange: this.onChange,
      value: this.state.value,
      error: this.context.errors[name],
      ...props,
    };

    return createElement(component, { ...inputProps });

    // if (typeof component === 'string') {
    //   return createElement(component, { ...inputProps })
    // } else {
    //   return createElement(component, { ...inputProps })
    // }
  }
}

Field.contextType = FormContext;
Field.defaultProps = {
  initial: '',
  handle: value => value,
};
Field.propTypes = {
  handle: PropTypes.func,
  name: PropTypes.string.isRequired,
  initial: PropTypes.any,
  component: PropTypes.any.isRequired,
  validate: PropTypes.func,
};

export default {
  create: form,
  Field
};
