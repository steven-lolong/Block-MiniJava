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
  },
  {
    id: 'aliasing-contrast',
    label: 'Aliasing Contrast (A vs B)',
    description: 'Two aliases, one field write: heap references print 4141, inline structures print 41 — load it in the A vs B tab',
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
                  fields: {
                    CLASS: 'Main',
                    ARG: 'args'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'go'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'P'
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
                  fields: {
                    CLASS: 'P'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'go'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: {
                                NAME: 'x'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_identifier',
                                    fields: {
                                      NAME: 'Cell'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_var_declaration',
                                  fields: {
                                    NAME: 'y'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_identifier',
                                        fields: {
                                          NAME: 'Cell'
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_assign',
                              fields: {
                                NAME: 'x'
                              },
                              inputs: {
                                VALUE: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'Cell'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'y'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'x'
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'y'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_method_call',
                                            fields: {
                                              METHOD: 'with'
                                            },
                                            inputs: {
                                              OBJECT: {
                                                block: {
                                                  type: 'mj_expr_identifier',
                                                  fields: {
                                                    NAME: 'y'
                                                  }
                                                }
                                              },
                                              ARGS: {
                                                block: {
                                                  type: 'mj_argument_item',
                                                  inputs: {
                                                    EXPR: {
                                                      block: {
                                                        type: 'mj_expr_integer',
                                                        fields: {
                                                          VALUE: 41
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
                              type: 'mj_expr_plus',
                              inputs: {
                                LEFT: {
                                  block: {
                                    type: 'mj_expr_times',
                                    inputs: {
                                      LEFT: {
                                        block: {
                                          type: 'mj_expr_method_call',
                                          fields: {
                                            METHOD: 'get'
                                          },
                                          inputs: {
                                            OBJECT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'x'
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      RIGHT: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 100
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                RIGHT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: {
                                            NAME: 'y'
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
                  next: {
                    block: {
                      type: 'mj_class_declaration',
                      fields: {
                        CLASS: 'Cell'
                      },
                      inputs: {
                        VARS: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'f'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            }
                          }
                        },
                        METHODS: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'with'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_identifier',
                                  fields: {
                                    NAME: 'Cell'
                                  }
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'v'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'f'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'v'
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_this'
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'get'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_identifier',
                                      fields: {
                                        NAME: 'f'
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
        ]
      }
    }
  },
  {
    id: 'independent-copies',
    label: 'Independent Copies (Rewrite)',
    description: 'Substitution copies the receiver: c.with(41).get() + c.get() rewrites to 41 + 0 — load it in the Rewrite tab',
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
                  fields: {
                    CLASS: 'Main',
                    ARG: 'args'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'both'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'P'
                                    }
                                  }
                                },
                                ARGS: {
                                  block: {
                                    type: 'mj_argument_item',
                                    inputs: {
                                      EXPR: {
                                        block: {
                                          type: 'mj_expr_new_object',
                                          fields: {
                                            CLASS: 'Cell'
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
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'P'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'both'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          PARAMS: {
                            block: {
                              type: 'mj_formal_parameter',
                              fields: {
                                NAME: 'c'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_identifier',
                                    fields: {
                                      NAME: 'Cell'
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_plus',
                              inputs: {
                                LEFT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_method_call',
                                          fields: {
                                            METHOD: 'with'
                                          },
                                          inputs: {
                                            OBJECT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'c'
                                                }
                                              }
                                            },
                                            ARGS: {
                                              block: {
                                                type: 'mj_argument_item',
                                                inputs: {
                                                  EXPR: {
                                                    block: {
                                                      type: 'mj_expr_integer',
                                                      fields: {
                                                        VALUE: 41
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
                                RIGHT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: {
                                            NAME: 'c'
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
                  next: {
                    block: {
                      type: 'mj_class_declaration',
                      fields: {
                        CLASS: 'Cell'
                      },
                      inputs: {
                        VARS: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'f'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            }
                          }
                        },
                        METHODS: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'with'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_identifier',
                                  fields: {
                                    NAME: 'Cell'
                                  }
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'v'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'f'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'v'
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_this'
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'get'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_identifier',
                                      fields: {
                                        NAME: 'f'
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
        ]
      }
    }
  }
];
