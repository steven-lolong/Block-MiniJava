export interface MiniJavaExample {
  id: string;
  label: string;
  description: string;
  state: Record<string, unknown>;
}

export const MINI_JAVA_EXAMPLES: MiniJavaExample[] = [
  {
    id: 'factorial',
    label: 'Factorial',
    description: 'Recursive MiniJava factorial program',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: { CLASS: 'Main', ARG: 'args' },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: { METHOD: 'ComputeFac' },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: { CLASS: 'Fac' }
                                  }
                                },
                                ARGS: {
                                  block: {
                                    type: 'mj_argument_item',
                                    inputs: {
                                      EXPR: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: { VALUE: 10 }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: { CLASS: 'Fac' },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: { NAME: 'ComputeFac' },
                        inputs: {
                          TYPE: { block: { type: 'mj_type_int' } },
                          PARAMS: {
                            block: {
                              type: 'mj_formal_parameter',
                              fields: { NAME: 'num' },
                              inputs: {
                                TYPE: { block: { type: 'mj_type_int' } }
                              }
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: { NAME: 'num_aux' },
                              inputs: {
                                TYPE: { block: { type: 'mj_type_int' } }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_if',
                              inputs: {
                                COND: {
                                  block: {
                                    type: 'mj_expr_less',
                                    inputs: {
                                      LEFT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: { NAME: 'num' }
                                        }
                                      },
                                      RIGHT: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: { VALUE: 1 }
                                        }
                                      }
                                    }
                                  }
                                },
                                THEN: {
                                  block: {
                                    type: 'mj_statement_assign',
                                    fields: { NAME: 'num_aux' },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: { VALUE: 1 }
                                        }
                                      }
                                    }
                                  }
                                },
                                ELSE: {
                                  block: {
                                    type: 'mj_statement_assign',
                                    fields: { NAME: 'num_aux' },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'mj_expr_times',
                                          inputs: {
                                            LEFT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: { NAME: 'num' }
                                              }
                                            },
                                            RIGHT: {
                                              block: {
                                                type: 'mj_expr_method_call',
                                                fields: { METHOD: 'ComputeFac' },
                                                inputs: {
                                                  OBJECT: { block: { type: 'mj_expr_this' } },
                                                  ARGS: {
                                                    block: {
                                                      type: 'mj_argument_item',
                                                      inputs: {
                                                        EXPR: {
                                                          block: {
                                                            type: 'mj_expr_minus',
                                                            inputs: {
                                                              LEFT: {
                                                                block: {
                                                                  type: 'mj_expr_identifier',
                                                                  fields: { NAME: 'num' }
                                                                }
                                                              },
                                                              RIGHT: {
                                                                block: {
                                                                  type: 'mj_expr_integer',
                                                                  fields: { VALUE: 1 }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_identifier',
                              fields: { NAME: 'num_aux' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
];

