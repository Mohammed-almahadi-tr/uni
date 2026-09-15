Imports System.Data.SqlClient

Public Class frmTuitionFees

    Sub clear()
        Me.combBatch.SelectedIndex = -1
        Me.CombColleg.SelectedIndex = -1
        Me.GridFees.Rows.Clear()
    End Sub

    Private Sub frmAnnualFees_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillBatch()
    End Sub

    Sub FillBatch()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.combBatch.Items.Clear()

            Dim cmd As New SqlCommand("select Distinct Batch From AcademicYear Where Batch Is Not Null", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.combBatch.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillFees()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.GridFees.Rows.Clear()

            'Dim cmd As New SqlCommand("select Distinct ProgramName,IsNull(dbo.GetProgramRegFees(ProgramName,N'" & Me.combBatch.SelectedItem & "'),0) RegFees From Programs", cnn3)
            'Dim Reader As SqlDataReader
            Dim cmd As New SqlCommand("select Distinct Program,TuitionFees,RegFees From TuitionFees where Batch= N'" & Me.combBatch.SelectedItem & "' and  Colleges=N'" & Me.CombColleg.SelectedItem & "' and Type=N'" & Me.CombType.SelectedItem & "'", cnn3)
            Dim Reader As SqlDataReader
            cnn3.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridFees.Rows.Add(New String() {Reader.Item("Program"), CDbl(Reader.Item("TuitionFees")).ToString("N2"), CDbl(Reader.Item("RegFees")).ToString("N2")})
            End While
            cnn3.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub GridFees_CellEndEdit(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs)
        Try
            Me.GridFees.CurrentCell.Value = CDbl(Me.GridFees.CurrentCell.Value).ToString("N2")
        Catch ex As Exception
            Me.GridFees.CurrentCell.Value = "0.00"
        End Try
    End Sub

    Private Sub btnSave_Click(sender As System.Object, e As System.EventArgs) Handles btnSave.Click
        ErrProv.Clear()
        If Me.combBatch.SelectedIndex = -1 Then
            ErrProv.SetError(Me.combBatch, "الرجاء إختيار الدفعة")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand

                cnn.Open()
                cmd.Connection = cnn

                cmd.CommandText = "Delete From TuitionFees Where Batch=N'" & Me.combBatch.SelectedItem & "'"
                cmd.ExecuteNonQuery()

                cmd.CommandText = "insert into TuitionFees (Batch,Colleges,Program,TuitionFees,RegFees,Type,Employee) values (@Batch,@Colleges,@Program,@TuitionFees,@RegFees,@Type,@Employee)"

                For Each row As DataGridViewRow In GridFees.Rows

                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@Batch", Me.combBatch.Text.Trim)
                    cmd.Parameters.AddWithValue("@Colleges", Me.CombColleg.Text.Trim)
                    cmd.Parameters.AddWithValue("@Type", Me.CombType.Text.Trim)
                    cmd.Parameters.AddWithValue("@Program", row.Cells(0).Value)
                    cmd.Parameters.AddWithValue("@RegFees", CDbl(row.Cells(2).Value))
                    cmd.Parameters.AddWithValue("@TuitionFees", CDbl(row.Cells(1).Value))
                    cmd.Parameters.AddWithValue("@Employee", CurrentUser)
                    cmd.ExecuteNonQuery()
                Next
                cnn.Close()

                MsgBox("تم الحفظ", MsgBoxStyle.Information)

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

    Private Sub btnClose_Click(sender As System.Object, e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub
    Private Sub CombType_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles CombType.SelectedIndexChanged
        FillFees()
    End Sub
End Class