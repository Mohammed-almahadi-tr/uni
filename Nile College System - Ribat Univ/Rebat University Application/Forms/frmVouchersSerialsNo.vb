Imports System.Data.SqlClient

Public Class frmVouchersSerialsNo

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.ErrProvider.Clear()
        If Me.CombUsers.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.CombUsers, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtLetter.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtLetter, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtSFrom.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtSFrom, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtSTo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtSTo, "الرجاء مراجعة البيانات")
            Exit Sub
        End If
       
        Try
            Dim str As String
            Dim cmd1 As New SqlCommand(" select  Letter from BillSNo where Letter= N'" & Me.txtLetter.Text & "' and (SFrom BETWEEN " & _
       Me.txtSFrom.Text & " and " & Me.txtSTo.Text & " or Sto BETWEEN " & _
       Me.txtSFrom.Text & " and " & Me.txtSTo.Text & " or  " & Me.txtSFrom.Text & " BETWEEN SFrom and Sto or " & Me.txtSTo.Text & " BETWEEN SFrom and Sto )", cnn)
            cnn.Open()
            str = cmd1.ExecuteScalar
            cnn.Close()
            If str = "" Then


                If Me.txtSFrom.Text.Trim.Length = 0 OrElse Me.txtSTo.Text.Trim.Length = 0 Then
                    MsgBox("الرجاء إدخال الأرقام التسلسلية")
                    Exit Sub
                ElseIf CInt(Me.txtSFrom.Text) > CInt(Me.txtSTo.Text) Then
                    MsgBox("الرجاء مراجعة الأرقام التسلسلية")
                    Exit Sub
                Else
                    Me.Cursor = Cursors.WaitCursor
                    Dim cmd As New SqlCommand("Insert Into BillSNo (Letter,SFrom,STo,Amount,UserName) Values (N'" & _
                                              Me.txtLetter.Text.Trim & "'," & Me.txtSFrom.Text.Trim & "," & Me.txtSTo.Text & _
                                              "," & Me.txtQnt.Text.Trim & ",N'" & Me.CombUsers.SelectedItem & "')", cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    Me.txtSFrom.Clear()
                    Me.txtSTo.Clear()
                    Me.txtQnt.Clear()

                    Fill()
                    Me.Cursor = Cursors.Default
                End If
            Else
                MsgBox("سيتكرر بعض الايصالات")
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub Fill()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select * From BillSNo Where UserName=N'" & Me.CombUsers.SelectedItem & "'", cnn)
            Dim Reader As SqlDataReader
            Me.ListView1.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While (Reader.Read)
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .subitems.add(Reader.Item(1))
                    .subitems.add(Reader.Item(2))
                    .subitems.add(Reader.Item(3))
                    .subitems.add(Reader.Item(4))
                End With
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

    Private Sub frmVouchersSerialsNo_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select UserName From Users Where Priv=N'محصل'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While (Reader.Read)
                Me.CombUsers.Items.Add(Reader.Item(0))
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

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If Me.ListView1.SelectedItems.Count = 0 Then
            Exit Sub
        ElseIf MsgBox("تأكيد الحذف؟") = MsgBoxResult.No Then
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Delete From BillSNo Where SNo = " & _
                                          Me.ListView1.SelectedItems.Item(0).Text, cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Fill()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.Message)
            End Try
        End If
    End Sub

    Sub Calculate()
        Try
            Dim Min, Max As Integer

            If Me.txtSFrom.Text.Trim.Length = 0 OrElse Me.txtSTo.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Min = CInt(Me.txtSFrom.Text)
            Max = CInt(Me.txtSTo.Text)
            Me.txtQnt.Text = CInt(Max - Min + 1)

        Catch ex As Exception
            Me.txtQnt.Clear()

        End Try
    End Sub

    Private Sub txtSFrom_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtSFrom.TextChanged
        Calculate()
    End Sub

    Private Sub txtSTo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtSTo.TextChanged
        Calculate()
    End Sub

    Private Sub CombUsers_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombUsers.SelectedIndexChanged
        Fill()
    End Sub

    Private Sub Button2_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select * From BillSNo order by letter,Sfrom ", cnn1)
            Dim das As New DataSet

            cnn1.Open()
            dap.Fill(das, "BillSNo")
            cnn1.Close()

            Dim rpt As New BillSNo
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub
End Class