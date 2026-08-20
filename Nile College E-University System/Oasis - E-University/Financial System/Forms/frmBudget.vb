Imports System.Data.SqlClient

Public Class frmBudget

    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc1 From Acc Where Acc1 Is Not Null", cnn)
            Dim Reader, Reader1, Reader2, Reader3 As SqlDataReader
            Dim i, i1, i2, i3 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc2 From Acc Where Acc1=N'" & Reader.Item(0) & "' and Acc2 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                    Dim cmd2 As New SqlCommand("Select Distinct Acc3 From Acc Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                               "Acc2=N'" & Reader1.Item(0) & "' and Acc3 Is Not Null", cnn2)

                    cnn2.Open()
                    Reader2 = cmd2.ExecuteReader
                    While Reader2.Read
                        Me.TreeAcc.Nodes(i).Nodes(i1).Nodes.Add(Reader2.Item(0))
                        Dim cmd3 As New SqlCommand("Select Distinct Acc4 From Acc Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4 Is Not Null", cnn3)

                        cnn3.Open()
                        Reader3 = cmd3.ExecuteReader
                        While Reader3.Read
                            Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes.Add(Reader3.Item(0))
                        End While
                        cnn3.Close()
                        i2 += 1
                    End While
                    cnn2.Close()
                    i2 = 0
                    i1 += 1
                End While

                cnn1.Close()
                i2 = 0
                i1 = 0
                i += 1
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmBudget_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        FillTree()
        FillBudget()
    End Sub

    Sub FillBudget()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select * From AccBudget Where Valid=1", cnn)
            Dim Reader As SqlDataReader

            Me.GridBudget.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridBudget.Rows.Add(New String() {Reader.Item("SNo"), CDate(Reader.Item("PeriodFrom")).ToString("yyyy/MM/dd"), _
                                                     CDate(Reader.Item("PeriodTo")).ToString("yyyy/MM/dd"), _
                                                     Reader.Item("Acc1"), Reader.Item("Acc2"), Reader.Item("Acc3"), Reader.Item("Acc4"), _
                                                     CDbl(Reader.Item("Amount")).ToString("N2"), "حذف"})
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub


    Private Sub TreeAcc_AfterSelect(sender As System.Object, e As System.Windows.Forms.TreeViewEventArgs) Handles TreeAcc.AfterSelect
        If e.Node.Level <> 3 Then
            Me.txtAcc1.Clear()
            Me.txtAcc2.Clear()
            Me.txtAcc3.Clear()
            Me.txtAcc4.Clear()
        Else
            Me.txtAcc1.Text = e.Node.Parent.Parent.Parent.Text
            Me.txtAcc2.Text = e.Node.Parent.Parent.Text
            Me.txtAcc3.Text = e.Node.Parent.Text
            Me.txtAcc4.Text = e.Node.Text
        End If
    End Sub

    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles Button1.Click
        If Me.txtAcc4.Text.Trim.Length = 0 Then
            MsgBox("Please select Account")
        ElseIf Len(Me.txtAmount.Text) = 0 Then
            MsgBox("Please check the amount")
            Me.txtAmount.Focus()
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                'Validate amount
                Try
                    Dim X As Double = CDbl(Me.txtAmount.Text)
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    MsgBox("Please check the amount")
                    Me.txtAmount.Clear()
                    Me.txtAmount.Focus()
                    Exit Sub
                End Try

                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans
                cmd.CommandText = "Insert Into AccBudget (PeriodFrom,PeriodTo,Acc1,Acc2,Acc3,Acc4,Amount,UserName) " & _
                                  "Values (@PeriodFrom,@PeriodTo,@Acc1,@Acc2,@Acc3,@Acc4,@Amount,@UserName)"

                'Add values
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@PeriodFrom", Me.DTPFrom.Value.ToShortDateString & " 10:10:10")
                cmd.Parameters.AddWithValue("@PeriodTo", Me.DTPTo.Value.ToShortDateString & " 10:10:10")
                cmd.Parameters.AddWithValue("@Acc1", Me.txtAcc1.Text)
                cmd.Parameters.AddWithValue("@Acc2", Me.txtAcc2.Text)
                cmd.Parameters.AddWithValue("@Acc3", Me.txtAcc3.Text)
                cmd.Parameters.AddWithValue("@Acc4", Me.txtAcc4.Text)
                cmd.Parameters.AddWithValue("@Amount", Me.txtAmount.Text.Trim)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                FillBudget()

                Me.txtAcc1.Clear()
                Me.txtAcc2.Clear()
                Me.txtAcc3.Clear()
                Me.txtAcc4.Clear()
                Me.txtAmount.Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub GridBudget_CellClick(sender As System.Object, e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridBudget.CellClick
        If e.ColumnIndex = 8 Then
            If MsgBox("Are You Sure ?", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                Try
                    Me.Cursor = Cursors.WaitCursor

                    Dim cmd As New SqlCommand("Update AccBudget Set Valid=0,DelUserName=N'" & CurrentUser & _
                                              "',DelDate=GetDate() Where SNo=" & Me.GridBudget.Rows(e.RowIndex).Cells(0).Value, cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillBudget()

                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        End If
    End Sub

    Private Sub btnShow_Click(sender As System.Object, e As System.EventArgs) Handles btnShow.Click
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Acc1,Acc2,Acc3,Acc4," & _
                                      "dbo.GetAccBudget(N'" & Me.DTPRptFrom.Value.ToShortDateString & " 00:00:01'," & _
                                                   "N'" & Me.DTPRptTo.Value.ToShortDateString & " 23:59:59',Acc1,Acc2,Acc3,Acc4) Budget," & _
                                      "dbo.GetAccAmount(N'" & Me.DTPRptFrom.Value.ToShortDateString & " 00:00:01'," & _
                                                   "N'" & Me.DTPRptTo.Value.ToShortDateString & " 23:59:59',Acc1,Acc2,Acc3,Acc4) Amount " & _
                                      "From AccBudget Where Valid=1", cnn)
            Dim Reader As SqlDataReader
            Dim DsBudg As New DsBudget

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                DsBudg.Tables(0).Rows.Add(New String() {Me.DTPRptFrom.Value, Me.DTPRptTo.Value, Reader.Item("Acc1"), Reader.Item("Acc2"), _
                                                        Reader.Item("Acc3"), Reader.Item("Acc4"), Reader.Item("Budget"), Reader.Item("Amount")})
            End While
            cnn.Close()

            Dim rpt As New Budget
            rpt.SetDataSource(DsBudg)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

   
End Class