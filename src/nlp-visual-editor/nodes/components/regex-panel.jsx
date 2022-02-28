import React, { Children, isValidElement, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import {
  Checkbox,
  Dropdown,
  NumberInput,
  RadioButton,
  RadioButtonGroup,
  SkeletonText,
  TextArea,
} from 'carbon-components-react';

import './regex-panel.scss';
import { saveNlpNode, setShowRightPanel } from '../../../redux/slice';

class RegexPanel extends React.Component {
  constructor(props) {
    super(props);
    const { saveNlpNode, setShowRightPanel, children, ...rest } = props;
    this.state = {
      ...rest,
    };
  }

  fetchResults = () => {
    fetch('/api/results', {
      headers: { 'Content-Type': 'text/html' },
    })
      .then((res) => res.text())
      .then((data) => {
        this.setState({ nlpResults: data });
      });
  };

  getDdlMatchCaseItems = () => {
    return [
      { id: 'match', text: 'Match case' },
      { id: 'ignore', text: 'Ignore case' },
      { id: 'match-unicode', text: 'Match unicode (ignore case)' },
    ];
  };

  handleChildComponents = () => {
    const { children } = this.props;
    const childrenWithProps = Children.map(children, (child) => {
      if (isValidElement(child)) {
        return cloneElement(child, { onClick: this.validateParameters });
      }
      return child;
    });
    return childrenWithProps;
  };

  validateParameters = () => {
    const { errorMessage, regexInput, ...rest } = this.state;
    const { nodeId } = this.props;
    let err = undefined;
    try {
      new RegExp(regexInput); //if throws an exception, regex is invalid
      if (regexInput.trim().length === 0) {
        throw 'You must enter an expression.';
      }
    } catch (e) {
      err = 'The expression is not a valid Regex';
    }

    this.setState({ errorMessage: err });

    if (!err) {
      const node = {
        nodeId,
        regexInput,
        ...rest,
        isValid: true,
      };
      this.props.saveNlpNode({ node });
      this.props.setShowRightPanel({ showPanel: false });
    }
  };

  onCaseSensitivityChange = (selectedItem) => {
    const { id } = selectedItem;
    let props = { caseSensitivity: id };
    if (id === 'match') {
      props = {
        ...props,
        dotAll: true,
      };
    }
    this.setState({ ...props });
  };

  onExpresionTypeChange = (type) => {
    const { caseSensitivity } = this.state;
    let props = { expressionType: type };
    if (type === 'literal') {
      // if literal is selected then all checkboxes should be unchecked
      props = {
        ...props,
        canonEq: false,
        dotAll: false,
        multiline: false,
        unixLines: false,
      };
    } else if (type === 'regular' && caseSensitivity === 'match') {
      props = {
        ...props,
        dotAll: true,
      };
    }
    this.setState({ ...props });
  };

  render() {
    const matchCaseItems = this.getDdlMatchCaseItems();
    const children = this.handleChildComponents();

    const {
      regexInput,
      expressionType,
      caseSensitivity,
      tokenRange,
      canonEq,
      dotAll,
      multiline,
      unixLines,
      errorMessage,
    } = this.state;

    const disableCheckboxes = expressionType === 'literal';

    return (
      <div className="regex-panel">
        <div className="regex-panel-contents">
          <TextArea
            labelText="Enter a regular expression"
            placeholder=""
            helperText="Example: [A-Z][a-z]+(s+[A-Z][a-z]+){0,2} to find one to three capitalized words"
            value={regexInput}
            invalid={errorMessage !== undefined}
            invalidText={errorMessage}
            onChange={(e) => {
              this.setState({ regexInput: e.target.value });
            }}
          />
          <RadioButtonGroup
            legendText="Match expression as"
            name="rdExpression"
            defaultSelected={expressionType}
            onChange={(value) => {
              this.onExpresionTypeChange(value);
            }}
          >
            <RadioButton
              labelText="Regular expression"
              value="regular"
              id="rd1"
            />
            <RadioButton labelText="Literal text" value="literal" id="rd2" />
          </RadioButtonGroup>
          <Dropdown
            id="ddlMatchCase"
            titleText="Case sensitivity"
            label="Dropdown menu options"
            size="sm"
            initialSelectedItem={matchCaseItems.find(
              (item) => caseSensitivity == item.id,
            )}
            items={matchCaseItems}
            itemToString={(matchCaseItems) =>
              matchCaseItems ? matchCaseItems.text : ''
            }
            onChange={({ selectedItem }) => {
              this.onCaseSensitivityChange(selectedItem);
            }}
          />
          <div className="token-range">
            <Checkbox
              labelText="Token range"
              id="chkTokenRange"
              checked={tokenRange.checked}
              onChange={(checked) =>
                this.setState({ tokenRange: { ...tokenRange, checked } })
              }
            />
            <div className="token-controls">
              <NumberInput
                id="rangeNumFrom"
                min={0}
                max={99}
                value={tokenRange.range[0]}
                size="sm"
                label="tokens from"
                hideLabel
                invalidText="Number is not valid"
                className="number-range"
                disabled={!tokenRange.checked}
                onChange={(e) => {
                  const { range, checked } = tokenRange;
                  this.setState({
                    tokenRange: {
                      checked,
                      range: [e.imaginaryTarget.value, range[1]],
                    },
                  });
                }}
              />
              <span>to</span>
              <NumberInput
                id="rangeNumTo"
                min={0}
                max={99}
                value={tokenRange.range[1]}
                size="sm"
                label="tokens to"
                hideLabel
                invalidText="Number is not valid"
                className="number-range"
                disabled={!tokenRange.checked}
                onChange={(e) => {
                  const { range, checked } = tokenRange;
                  this.setState({
                    tokenRange: {
                      checked,
                      range: [range[0], e.imaginaryTarget.value],
                    },
                  });
                }}
              />
              <span>tokens</span>
            </div>
          </div>
          <div className="chk-series">
            <Checkbox
              labelText="Allow canonical equivalence (CANON_EQ)"
              id="chkCanEq"
              checked={canonEq}
              disabled={disableCheckboxes}
              onChange={(checked) => this.setState({ canonEq: checked })}
            />
            <Checkbox
              labelText="Read line delimiters as characters (DOTALL)"
              id="chkLineDel"
              checked={dotAll}
              disabled={caseSensitivity === 'match' || disableCheckboxes}
              onChange={(checked) => this.setState({ dotAll: checked })}
            />
            <Checkbox
              labelText="^ and $ begin and end a line (MULTILINE)"
              id="chkParams"
              checked={multiline}
              disabled={disableCheckboxes}
              onChange={(checked) => this.setState({ multiline: checked })}
            />
            <Checkbox
              labelText="Newline character ( ) ends a line (UNIX_LINES)"
              id="chkNewline"
              checked={unixLines}
              disabled={disableCheckboxes}
              onChange={(checked) => this.setState({ unixLines: checked })}
            />
          </div>
        </div>
        {children}
      </div>
    );
  }
}

RegexPanel.propTypes = {
  nodeId: PropTypes.string.isRequired,
};

RegexPanel.defaultProps = {
  regexInput: '',
  expressionType: 'regular',
  caseSensitivity: 'match',
  tokenRange: {
    checked: false,
    range: [0, 0],
  },
  canonEq: false,
  dotAll: true,
  multiline: false,
  unixLines: false,
  errorMessage: undefined,
};

const mapStateToProps = (state) => ({
  pipelineId: state.nodesReducer.pipelineId,
});

const mapDispatchToProps = (dispatch) => ({
  saveNlpNode: (node) => dispatch(saveNlpNode(node)),
  setShowRightPanel: (doShow) => dispatch(setShowRightPanel(doShow)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RegexPanel);
