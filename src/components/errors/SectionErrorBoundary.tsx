import React from 'react';
import { logError } from '@/utils';

type SectionErrorBoundaryProps = {
  children: React.ReactNode;
  fallback:
    | React.ReactNode
    | ((args: { error: Error; reset: () => void }) => React.ReactNode);
  name?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: ReadonlyArray<unknown>;
};

type SectionErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

function isRenderFunction(
  fallback: SectionErrorBoundaryProps['fallback'],
): fallback is (args: { error: Error; reset: () => void }) => React.ReactNode {
  return typeof fallback === 'function';
}

function areKeysEqual(
  current?: ReadonlyArray<unknown>,
  previous?: ReadonlyArray<unknown>,
): boolean {
  if (!current || !previous) {
    return false;
  }
  if (current.length !== previous.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    if (!Object.is(current[index], previous[index])) {
      return false;
    }
  }
  return true;
}

export default class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const { name = 'SectionErrorBoundary', onError } = this.props;
    logError(`${name} captured an error`, { error, info }, name);
    if (onError) {
      onError(error, info);
    }
  }

  componentDidUpdate(prevProps: SectionErrorBoundaryProps) {
    const { resetKeys } = this.props;
    if (
      this.state.hasError &&
      resetKeys &&
      !areKeysEqual(resetKeys, prevProps.resetKeys)
    ) {
      this.reset();
    }
  }

  private readonly reset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (isRenderFunction(fallback)) {
        return fallback({ error, reset: this.reset });
      }
      return fallback;
    }

    return children;
  }
}
